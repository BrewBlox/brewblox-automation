import { TimeElapsedImpl } from '../types';
import { ConditionHandler } from './types';

/**
 * Wait for a set amount of time to be elapsed.
 * This can be from either the Process start, or the start of current step.
 *
 * If current step is used, the start time is the moment action application was done.
 */
const handler: ConditionHandler<TimeElapsedImpl> = {
  async check({ impl }, { proc, activeStep }) {
    if (impl.duration <= 0) {
      return true;
    }
    if (impl.start === 'Process') {
      const startTime = proc.results[0].date;
      return startTime + impl.duration < new Date().getTime();
    }
    else if (impl.start === 'Step') {
      for (let i = proc.results.length - 1; i >= 0; --i) {
        const result = proc.results[i];
        if (result.stepId === activeStep.id && result.stepStatus === 'Created') {
          // We start counting from the moment actions were applied
          const startResult = proc.results.slice(i)
            .find(v => v.stepId === activeStep.id && v.stepStatus === 'Active');
          return startResult !== undefined
            ? startResult.date + impl.duration < new Date().getTime()
            : false;
        }
      }
      throw new Error('No result found for current step with status Created');
    }
    else {
      throw new Error(`Invalid start field in TimeElapsed: ${impl.start}`);
    }
  },
};

export default handler;
