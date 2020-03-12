import isString from 'lodash/isString';
import { v4 as uid } from 'uuid';

import args from './args';
import { processDb, taskDb } from './database';
import { eventbus } from './eventbus';
import { actionHandlers, conditionHandlers } from './handlers';
import { HandlerOpts } from './handlers/types';
import logger from './logger';
import {
  AutomationProcess,
  AutomationStatus,
  AutomationStep,
  AutomationStepResult,
  AutomationTransition,
} from './types';

const endStates: AutomationStatus[] = [
  'Done',
  'Paused',
  'Interrupted',
  'Cancelled',
  'Invalid',
];

function end(proc: AutomationProcess, status: AutomationStatus): AutomationProcess {
  logger.info(`${proc.id}::${proc.title} ended with status '${status}'`);
  proc.status = status;
  proc.end = new Date().getTime();
  return proc;
};

function interrupt(proc: AutomationProcess): AutomationProcess {
  logger.info(`${proc.id}::${proc.title} interrupted`);
  proc.status = 'Interrupted';
  return proc;
};

async function apply(opts: HandlerOpts): Promise<void> {
  for (const action of opts.step.actions.filter(v => v.enabled)) {
    const handler = actionHandlers[action.impl.type];
    await handler.apply(action, opts);
  }
};

async function check(opts: HandlerOpts): Promise<AutomationTransition | null> {
  for (const transition of opts.step.transitions.filter(v => v.enabled)) {
    let ok = true;
    for (const condition of transition.conditions.filter(v => v.enabled)) {
      const handler = conditionHandlers[condition.impl.type];
      if (!await handler.check(condition, opts)) {
        ok = false;
        break;
      }
    }
    if (ok) {
      return transition;
    }
  }
  return null;
};

function createResult(step: AutomationStep): AutomationStepResult {
  return {
    id: uid(),
    title: step.title,
    stepId: step.id,
    start: new Date().getTime(),
    end: null,
    status: 'Created',
  };
};

/**
 * Update a single process.
 * Will apply actions, and transition between steps.
 *
 * @param proc The evaluated process
 * @returns the updated process if the process was changed.
 */
export async function update(proc: AutomationProcess): Promise<AutomationProcess | null> {
  /**
   * Nothing to see here.
   * Move along.
   */
  if (endStates.includes(proc.status)) {
    return null;
  }

  /**
   * Not all paths lead to an early exit.
   * Keep track of the "before" state.
   */
  const original = JSON.stringify(proc);

  /**
   * First update for this process.
   */
  if (proc.status === 'Created') {
    proc.start = new Date().getTime();
    proc.status = 'Started';
  }

  /**
   * Process doesn't have any steps.
   * Immediately mark as done.
   */
  if (proc.steps.length === 0) {
    return end(proc, 'Done');
  }

  /**
   * Process doesn't have any results.
   * Initialize one for the first step.
   */
  if (proc.results.length === 0) {
    const [step] = proc.steps;
    proc.results.push(createResult(step));
  }

  /**
   * Find current result and step.
   */
  const result = proc.results[proc.results.length - 1];
  const step = proc.steps.find(s => s.id === result.stepId);
  const opts: HandlerOpts = { proc, step, result };

  /**
   * No matching step found for current result.
   * This is not normal flow.
   * Abort the process.
   */
  if (step === undefined) {
    logger.error(`Invalid step ID in result: ${result.stepId}`);
    return end(proc, 'Invalid');
  }

  /**
   * Current result ended before process end.
   * This is not normal flow.
   * Abort the process.
   */
  if (endStates.includes(result.status)) {
    logger.error(`Last result ended before process: '${result.status}'`);
    return end(proc, 'Invalid');
  }

  /**
   * Step was not yet started. Apply actions.
   */
  if (result.status === 'Created') {
    try {
      await apply(opts);
      result.status = 'Started';
    }
    catch (e) {
      logger.error(`${step.id}::${step.title} apply error: ${e.message}`);
      return interrupt(proc);
    }
  }

  /**
   * Step in progress. Evaluate all transitions.
   * If no transitions are set, the process will continue to next step (by index).
   *
   * A transition without conditions will evaluate true.
   */
  if (result.status === 'Started') {
    /**
     * No transitions set. Go to next step (by index).
     */
    if (!step.transitions.find(v => v.enabled)) {
      // Mark result as done
      result.status = 'Done';
      result.end = new Date().getTime();

      // Go to: next step (by index)
      const stepIdx = proc.steps.findIndex(s => s.id === step.id);
      const nextStep = proc.steps[stepIdx + 1];
      if (nextStep) {
        proc.results.push(createResult(nextStep));
      }
      else {
        return end(proc, 'Done');
      }
    }
    /**
     * Evaluate transitions.
     * First one to evaluate true gets to pick next step.
     */
    else {
      // Find first valid transition
      let transition: AutomationTransition | null = null;
      try {
        transition = await check(opts);
      }
      catch (e) {
        logger.error(`${step.id}::${step.title} evaluate error: ${e.message}`);
        return interrupt(proc);
      }

      if (transition) {
        // Mark result as done
        result.status = 'Done';
        result.end = new Date().getTime();

        // Go to: next step (by step ID)
        if (isString(transition.next)) {
          const nextStep = proc.steps.find(s => s.id === transition.next);
          if (nextStep) {
            proc.results.push(createResult(nextStep));
          }
          else {
            // Referenced step ID doesn't exist
            // Abort process
            logger.error(`Invalid step ID in transition.next: '${transition.next}'`);
            return end(proc, 'Invalid');
          }
        }

        // Go to: next step (by index)
        else if (transition.next === true) {
          const stepIdx = proc.steps.findIndex(s => s.id === step.id);
          const nextStep = proc.steps[stepIdx + 1];
          if (nextStep) {
            proc.results.push(createResult(nextStep));
          }
          else {
            return end(proc, 'Done');
          }
        }

        // Go to: process end
        else if (transition.next === false) {
          return end(proc, 'Done');
        }

        // Invalid value for transition.next
        // Abort process
        else {
          logger.error(`Invalid value for transition.next: '${transition.next}'`);
          return end(proc, 'Invalid');
        }
      }
    }
  }

  /**
   * Check whether process was changed
   */
  return JSON.stringify(proc) !== original
    ? proc
    : null;
}

export class StateMachine {

  public start(): void {
    logger.info('Started state machine');
    setInterval(() => this.run(), 5000);
  }

  public async run(): Promise<void> {
    try {
      for (const proc of await processDb.fetchAll()) {
        const updated = await update(proc);
        if (updated) {
          await processDb.save(updated);
        }
      }

      const processes = await processDb.fetchAll();
      const tasks = await taskDb.fetchAll();

      await eventbus.publish({
        key: args.name,
        type: 'Automation.active',
        data: { processes, tasks },
        duration: '60s',
      });
    }
    catch (e) {
      logger.error(`State machine error: ${e.message}`);
    }
  }
}

export const stateMachine = new StateMachine();
