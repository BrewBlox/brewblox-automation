import { TimeAbsoluteImpl } from '../types';
import { ConditionHandler } from './types';

/**
 * Wait for the specified absolute date.
 */
const handler: ConditionHandler<TimeAbsoluteImpl> = {

  async prepare(opts) {
    void opts;
  },

  async check({ impl }) {
    return !impl.time || new Date().getTime() > new Date(impl.time).getTime();
  },
};

export default handler;
