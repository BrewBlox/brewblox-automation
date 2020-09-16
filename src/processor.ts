import flatMap from 'lodash/flatMap';
import isString from 'lodash/isString';
import takeRight from 'lodash/takeRight';
import { v4 as uid } from 'uuid';

import { processDb, taskDb } from './database';
import { eventbus } from './eventbus';
import { sleep } from './functional';
import { getHandler } from './handlers';
import logger from './logger';
import {
  AutomationCondition,
  AutomationItem,
  AutomationProcess,
  AutomationStep,
  AutomationStepJump,
  AutomationStepResult,
  AutomationTransition,
  HandlerOpts,
  UUID,
} from './types';

type UpdateResult = AutomationStepResult | null;

type UpdateFunc = (opts: HandlerOpts) => Promise<UpdateResult>;


const MAX_RESULTS = 100;


const currentResult = (proc: AutomationProcess): AutomationStepResult => {
  return proc.results[proc.results.length - 1] ?? null;
};

const currentStep = (proc: AutomationProcess): AutomationStep | null => {
  const result = currentResult(proc);
  return result
    ? proc.steps.find(s => s.id === result.stepId) ?? null
    : null;
};

/**
 * Autofills the generic fields of a Result.
 *
 * @param opts Handler opts containing process and computed values.
 */
const createResult = (opts: Omit<AutomationStepResult, 'id' | 'date'>): AutomationStepResult => {
  return {
    id: uid(),
    date: new Date().getTime(),
    ...opts,
  };
};

/**
 *
 * @param opts Handler opts containing process and computed values.
 * @param error Error message
 */
const errorResult = (opts: HandlerOpts, error: string): AutomationStepResult => {
  const { activeResult, activeStep } = opts;
  const { stepId, phase, status } = activeResult;

  if (activeResult.error !== undefined) {
    return activeResult;
  }

  logger.error(`${activeStep.id}::${activeStep.title} ${phase} error: ${error}`);
  return createResult({ stepId, phase, status, error });
};

/**
 * Check all enabled conditions.
 * Return true if all conditions evaluate true.
 *
 * @param opts Handler opts containing process and computed values.
 * @param conditions List of checked conditions.
 */
const evaluateConditions = async (opts: HandlerOpts, conditions: AutomationCondition[]): Promise<boolean> => {
  for (const condition of conditions.filter(v => v.enabled)) {
    const handler = getHandler(condition.impl.type);
    if (!await handler.check(condition, opts)) {
      return false;
    }
  }
  return true;
};

/**
 * Check all enabled transitions.
 * Return the first transition that evaluates true.
 *
 * @param opts Handler opts containing process and computed values.
 */
const findValidTransition = async (opts: HandlerOpts): Promise<AutomationTransition | null> => {
  for (const transition of opts.activeStep.transitions.filter(v => v.enabled)) {
    if (await evaluateConditions(opts, transition.conditions)) {
      return transition;
    }
  }
  return null;
};

/**
 * Create a new Result indicating that both the current step, and the entire process are done.
 *
 * @param opts Handler opts containing process and computed values.
 */
const advanceToEnd = (opts: HandlerOpts): AutomationStepResult => {
  return createResult({
    stepId: opts.activeResult.stepId,
    phase: 'Finished',
    status: 'Finished',
  });
};

/**
 * Advance to the next step in the step list.
 * If current step is the last, end the process.
 * Always creates a new Result.
 *
 * @param opts Handler opts containing process and computed values.
 */
const advanceToNext = (opts: HandlerOpts): AutomationStepResult => {
  const { proc, activeStep } = opts;
  const stepIdx = proc.steps.findIndex(s => s.id === activeStep.id);
  const nextStep = proc.steps[stepIdx + 1];
  return nextStep
    ? createResult({
      stepId: nextStep.id,
      phase: 'Created',
      status: 'Active',
    })
    : advanceToEnd(opts);
};

/**
 * Find the next step by its ID, and create a Result with the new stepId.
 *
 * @param opts Handler opts containing process and computed values.
 * @param stepId Unique ID of target step.
 */
const advanceToId = (opts: HandlerOpts, stepId: UUID): AutomationStepResult => {
  const { proc } = opts;
  const nextStep = proc.steps.find(s => s.id === stepId);
  return nextStep
    ? createResult({
      stepId,
      phase: 'Created',
      status: 'Active',
    })
    : createResult({
      stepId: null,
      phase: 'Invalid',
      status: 'Invalid',
    });
};

/**
 * Identify the next step, and return a relevant Result.
 *
 * @param opts Handler opts containing process and computed values.
 * @param transition Transition object that evaluated true.
 */
const advance = (opts: HandlerOpts, transition: AutomationTransition): AutomationStepResult => {
  if (transition.next === false) {
    return advanceToEnd(opts);
  }
  else if (transition.next === true) {
    return advanceToNext(opts);
  }
  else if (isString(transition.next)) {
    return advanceToId(opts, transition.next);
  }
  else {
    // Not normal flow
    // This scenario should be prevented by validating the template
    return createResult({
      stepId: opts.activeStep.id,
      phase: 'Invalid',
      status: 'Invalid',
    });
  }
};

/**
 * Create Result if none yet set in this process.
 * All subsequent update functions expect activeStep and activeResult to be set.
 *
 * If the process doesn't have any steps,
 * the generated result will immediately have the Finished status.
 *
 * @param opts Handler opts containing process and computed values.
 */
const initialProcessResult: UpdateFunc = async ({ proc, activeResult }) => {
  if (activeResult) {
    return null;
  }
  return proc.steps.length > 0
    ? createResult({
      stepId: proc.steps[0].id,
      phase: 'Created',
      status: 'Active',
    })
    : createResult({
      stepId: null,
      phase: 'Invalid',
      status: 'Finished',
    });
};

/**
 * Check whether the update for this process should be aborted.
 * Return active result to signal nothing new should be expected.
 *
 * @param opts Handler opts containing process and computed values.
 */
const earlyExit: UpdateFunc = async ({ activeResult }) => {
  if (activeResult.status !== 'Active') {
    return activeResult;
  }
  return null;
};

/**
 * Create a more specific Result if the active status is 'Created'.
 *
 * @param opts Handler opts containing process and computed values.
 */
const prepareStep: UpdateFunc = async (opts) => {
  const { activeResult, activeStep } = opts;
  if (activeResult.phase !== 'Created') {
    return null;
  }

  try {
    const transitions = activeStep.transitions.filter(v => v.enabled);
    const items: AutomationItem[] = [
      ...activeStep.preconditions,
      ...activeStep.actions,
      ...flatMap(transitions, t => t.conditions),
    ]
      .filter(v => v.enabled);

    for (const item of items) {
      await getHandler(item.impl.type).prepare(item, opts);
    }
  }
  catch (e) {
    return errorResult(opts, e.message);
  }

  return createResult({
    stepId: activeResult.stepId,
    phase: 'Preconditions',
    status: 'Active',
  });
};

/**
 * Evaluate preconditions if status is 'Preconditions'.
 * If all preconditions evaluate true, return a Result with status 'Actions'.
 *
 * @param opts Handler opts containing process and computed values.
 */
const checkPreconditions: UpdateFunc = async (opts) => {
  const { activeStep, activeResult } = opts;

  if (activeResult.phase !== 'Preconditions') {
    return null;
  }

  try {
    return await evaluateConditions(opts, activeStep.preconditions)
      ? createResult({
        stepId: activeStep.id,
        phase: 'Actions',
        status: 'Active',
      })
      : activeResult;
  }
  catch (e) {
    return errorResult(opts, e.message);
  }
};

/**
 * Apply step actions if phase is 'Actions'.
 * After applying actions, return a Result with phase 'Transitions'.
 *
 * @param opts Handler opts containing process and computed values.
 */
const applyActions: UpdateFunc = async (opts) => {
  const { activeStep, activeResult } = opts;

  if (activeResult.phase !== 'Actions') {
    return null;
  }

  try {
    for (const action of activeStep.actions.filter(v => v.enabled)) {
      const handler = getHandler(action.impl.type);
      await handler.apply(action, opts);
    }
    return createResult({
      stepId: activeStep.id,
      phase: 'Transitions',
      status: 'Active',
    });
  }
  catch (e) {
    return errorResult(opts, e.message);
  }
};

/**
 * Evaluate all step transitions.
 * If a transition evaluates true,
 * return a Result with phase 'Created', and the new step ID
 *
 * @param opts Handler opts containing process and computed values.
 */
const checkTransitions: UpdateFunc = async (opts) => {
  const { activeStep, activeResult } = opts;

  if (activeResult.phase !== 'Transitions') {
    return null;
  }

  // Immediately go to next step if there aren't any transitions
  if (!activeStep.transitions.find(v => v.enabled)) {
    return advanceToNext(opts);
  }

  try {
    const transition = await findValidTransition(opts);
    return transition
      ? advance(opts, transition)
      : null;
  }
  catch (e) {
    return errorResult(opts, e.message);
  }
};

/**
 * Find and return the next relevant result.
 * Returns null if no more results should be expected this run() cycle.
 *
 * @param proc The evaluated process.
 * @returns A new result, if available.
 */
export async function nextUpdateResult(proc: AutomationProcess): Promise<UpdateResult | null> {
  const opts: HandlerOpts = {
    proc,
    activeStep: currentStep(proc)!, // null checked in initialProcessResult
    activeResult: currentResult(proc),
  };
  const result = null
    ?? await initialProcessResult(opts)
    ?? await earlyExit(opts)
    ?? await prepareStep(opts)
    ?? await checkPreconditions(opts)
    ?? await applyActions(opts)
    ?? await checkTransitions(opts);

  /**
   * We allow subroutines to return activeResult.
   * This signals that the subroutine is still busy, but has no news.
   *
   * If this happens, return null instead of the duplicate.
   */
  return result && result.id !== opts.activeResult?.id
    ? result
    : null;
}

/**
 * Apply a jump Result to a process.
 * Status is 'Created' unless explicitly set by caller.
 *
 * @param proc The evaluated process.
 * @param jump The external jump instruction.
 * @returns the updated process if the process was changed.
 */
export async function applyStepJump(proc: AutomationProcess, jump: AutomationStepJump): Promise<AutomationProcess> {
  const result = createResult({
    stepId: jump.stepId,
    phase: jump.phase ?? 'Created',
    status: 'Active',
  });
  proc.results.push(result);
  return proc;
}

/**
 * Update a single process.
 * Will apply actions and check transitions.
 *
 * @param proc The evaluated process
 * @returns the updated process if the process was changed.
 */
export async function updateProcess(proc: AutomationProcess): Promise<AutomationProcess | null> {
  let changed = false;

  // Call nextUpdateResult() until it stops yielding updates
  while (true) {
    const result = await nextUpdateResult(proc);
    if (!result) {
      return changed ? proc : null;
    }
    changed = true;
    proc.results.push(result);
  }
}

export class Processor {
  private pending: AutomationStepJump[] = [];

  public start(): void {
    logger.info('Started processor');
    this.repeat();
  }

  public async repeat(): Promise<void> {
    // Under some circumstances, update() can take >5s.
    // setInterval() would then schedule a new call before the previous finished.
    // Using an async loop ensures a 5s idle period between updates.
    while (true) {
      await sleep(5000);
      await this.update();
    }
  }

  public async update(): Promise<void> {
    const pendingNow = [...this.pending];
    this.pending = [];

    while (pendingNow.length) {
      const jump = pendingNow.shift()!;
      try {
        const proc = await processDb.fetchById(jump.processId);
        if (proc) {
          await processDb.save(await applyStepJump(proc, jump));
        }
      }
      catch (e) {
        logger.error(`Processor jump error: ${e.message}`);
        // Push all unhandled jumps back on the pending list
        this.pending.splice(0, 0, jump, ...pendingNow);
        return;
      }
    }

    try {
      for (const proc of await processDb.fetchAll()) {
        const updated = await updateProcess(proc);
        if (updated) {
          updated.results = takeRight(updated.results, MAX_RESULTS);
          await processDb.save(updated);
        }
      }

      const processes = await processDb.fetchAll();
      const tasks = await taskDb.fetchAll();
      await eventbus.publishActive({ processes, tasks });
    }
    catch (e) {
      logger.error(`Processor update error: ${e.message}`);
    }
  }

  public scheduleStepJump(change: AutomationStepJump): void {
    this.pending.push(change);
  }
}

export const processor = new Processor();
