import { TimeElapsedImpl } from '../types';
import { ConditionHandler } from './types';

const handler: ConditionHandler<TimeElapsedImpl> = {
  async check(item) {
    void item;
    return true;
  },
};

export default handler;
