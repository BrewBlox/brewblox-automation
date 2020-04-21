import isString from 'lodash/isString';
import { v4 as uid } from 'uuid';

import args from './args';
import { processDb, taskDb } from './database';
import { eventbus } from './eventbus';
import { actionHandlers, conditionHandlers } from './handlers';
import logger from './logger';
import {
  AutomationCondition,
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


const currentResult = (proc: AutomationProcess): AutomationStepResult => {
  return proc.results[proc.results.length - 1] ?? null;
};

const currentStep = (proc: AutomationProcess): AutomationStep => {
  const result = currentResult(proc);
  return result
    ? proc.steps.find(s => s.id === result.stepId)
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
  const { stepId, stepStatus, processStatus } = activeResult;

  if (activeResult.error !== undefined) {
    return activeResult;
  }

  logger.error(`${activeStep.id}::${activeStep.title} precondition error: ${error}`);
  return createResult({ stepId, stepStatus, processStatus, error });
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
    const handler = conditionHandlers[condition.impl.type];
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
    stepStatus: 'Finished',
    processStatus: 'Finished',
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
      stepStatus: 'Created',
      processStatus: 'Active',
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
      stepStatus: 'Created',
      processStatus: 'Active',
    })
    : createResult({
      stepId: null,
      stepStatus: 'Invalid',
      processStatus: 'Invalid',
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
      stepStatus: 'Invalid',
      processStatus: 'Invalid',
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
      stepStatus: 'Created',
      processStatus: 'Active',
    })
    : createResult({
      stepId: null,
      stepStatus: 'Invalid',
      processStatus: 'Finished',
    });
};

/**
 * Check whether the update for this process should be aborted.
 * Return active result to signal nothing new should be expected.
 *
 * @param opts Handler opts containing process and computed values.
 */
const earlyExit: UpdateFunc = async ({ activeResult }) => {
  if (activeResult.processStatus !== 'Active') {
    return activeResult;
  }
  return null;
};

/**
 * Create a more specific Result if the active status is 'Created'.
 *
 * @param opts Handler opts containing process and computed values.
 */
const initialStepResult: UpdateFunc = async ({ activeResult }) => {
  if (activeResult.stepStatus !== 'Created') {
    return null;
  }

  return createResult({
    stepId: activeResult.stepId,
    stepStatus: 'Preconditions',
    processStatus: 'Active',
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

  if (activeResult.stepStatus !== 'Preconditions') {
    return null;
  }

  try {
    return await evaluateConditions(opts, activeStep.preconditions)
      ? createResult({
        stepId: activeStep.id,
        stepStatus: 'Actions',
        processStatus: 'Active',
      })
      : activeResult;
  }
  catch (e) {
    return errorResult(opts, e.message);
  }
};

/**
 * Apply step actions if status is 'Actions'.
 * After applying actions, return a Result with status 'Transitions'.
 *
 * @param opts Handler opts containing process and computed values.
 */
const applyActions: UpdateFunc = async (opts) => {
  const { activeStep, activeResult } = opts;

  if (activeResult.stepStatus !== 'Actions') {
    return null;
  }

  try {
    for (const action of activeStep.actions.filter(v => v.enabled)) {
      const handler = actionHandlers[action.impl.type];
      await handler.apply(action, opts);
    }
    return createResult({
      stepId: activeStep.id,
      stepStatus: 'Transitions',
      processStatus: 'Active',
    });
  }
  catch (e) {
    return errorResult(opts, e.message);
  }
};

/**
 * Evaluate all step transitions.
 * If a transition evaluates true,
 * return a Result with status 'Created', and the new step ID
 *
 * @param opts Handler opts containing process and computed values.
 */
const checkTransitions: UpdateFunc = async (opts) => {
  const { activeStep, activeResult } = opts;

  if (activeResult.stepStatus !== 'Transitions') {
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
export async function nextUpdateResult(proc: AutomationProcess): Promise<UpdateResult> {
  const opts: HandlerOpts = {
    proc,
    activeStep: currentStep(proc),
    activeResult: currentResult(proc),
  };
  const result = null
    ?? await initialProcessResult(opts)
    ?? await earlyExit(opts)
    ?? await initialStepResult(opts)
    ?? await checkPreconditions(opts)
    ?? await applyActions(opts)
    ?? await checkTransitions(opts);

  /**
   * We allow subroutines to return activeResult.
   * This signals that the subroutine is still busy, but has no news.
   *
   * If this happens, return null instead of the duplicate.
   */
  return result.id !== opts.activeResult?.id
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
    stepStatus: jump.stepStatus ?? 'Created',
    processStatus: 'Active',
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
    setInterval(() => this.update(), 5000);
  }

  public async update(): Promise<void> {
    const pendingNow = [...this.pending];
    this.pending = [];

    while (pendingNow.length) {
      const jump = pendingNow.shift();
      try {
        const proc = await processDb.fetchById(jump.processId);
        await processDb.save(await applyStepJump(proc, jump));
      }
      catch (e) {
        logger.error(`Processor jump error: ${e.message}`);
        // Push all unhandled jumps back on the pending list
        this.pending.splice(0, 0, jump, ...pendingNow);
        return;
      }
    }

    try {
      const processes = await processDb.fetchAll();
      const tasks = await taskDb.fetchAll();

      await eventbus.publish({
        key: args.name,
        type: 'Automation.active',
        data: { processes, tasks },
        ttl: '60s',
      });
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
