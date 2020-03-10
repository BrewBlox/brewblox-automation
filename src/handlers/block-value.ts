import { BlockValueImpl } from '../types';
import { ConditionHandler } from './types';

const handler: ConditionHandler<BlockValueImpl> = {
  async check(item) {
    void item;
    return true;
  },
};

export default handler;
