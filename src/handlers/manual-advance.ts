import { ManualAdvanceImpl } from '../types';
import { ConditionHandler } from './types';

const handler: ConditionHandler<ManualAdvanceImpl> = {
  async check(item) {
    void item;
    return true;
  },
};

export default handler;
