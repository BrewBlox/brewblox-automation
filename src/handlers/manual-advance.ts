import { ManualAdvanceImpl } from '../types';
import { ConditionHandler } from './types';

/**
 * ManualAdvance enforces the user to explicitly advance the process.
 * It will always evaluate false.
 */
const handler: ConditionHandler<ManualAdvanceImpl> = {
  async check() {
    return false;
  },
};

export default handler;
