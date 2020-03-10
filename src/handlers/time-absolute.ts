import { TimeAbsoluteImpl } from '../types';
import { ConditionHandler } from './types';

const handler: ConditionHandler<TimeAbsoluteImpl> = {
  async check(item) {
    void item;
    return true;
  },
};

export default handler;
