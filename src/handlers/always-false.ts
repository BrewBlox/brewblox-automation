import { AlwaysFalseImpl } from '../types';
import { ConditionHandler } from './types';

/**
 * AlwaysFalse enforces the user to explicitly advance the process.
 */
const handler: ConditionHandler<AlwaysFalseImpl> = {
  async check() {
    return false;
  },
};

export default handler;
