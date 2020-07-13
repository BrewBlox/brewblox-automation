import { DateTime } from '../shared-types';
import { TimeElapsedImpl } from '../types';
import { ConditionHandler } from './types';

const ms = (date: DateTime): number => new Date(date).getTime();

/**
 * Wait for a set amount of time to be elapsed.
 * This can be from either the Process start, or the start of current step.
 *
 * If current step is used, the start time is the moment action application was done.
 */
const handler: ConditionHandler<TimeElapsedImpl> = {

  async prepare(opts) {
    void opts;
  },

  async check({ impl }, { proc, activeStep, activeResult }) {
    if (impl.duration <= 0) {
      return true;
    }
    if (impl.start === 'Process') {
      const startTime = ms(proc.results[0].date);
      return startTime + impl.duration < new Date().getTime();
    }
    else if (impl.start === 'Step') {
      for (let i = proc.results.length - 1; i >= 0; --i) {
        const result = proc.results[i];
        if (result.stepId === activeStep.id && result.phase === 'Created') {
          // We start counting from the moment the step entered the current phase
          const startResult = proc.results.slice(i)
            .find(v => v.stepId === activeStep.id && v.phase === activeResult.phase);
          return startResult !== undefined
            ? ms(startResult.date) + impl.duration < new Date().getTime()
            : false;
        }
      }
      throw new Error('No result found for current step with phase Created');
    }
    else {
      throw new Error(`Invalid start field in TimeElapsed: ${impl.start}`);
    }
  },
};

export default handler;
