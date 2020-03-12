import { TimeElapsedImpl } from '../types';
import { ConditionHandler } from './types';

const handler: ConditionHandler<TimeElapsedImpl> = {
  async check({ impl }, { result }) {
    return new Date(result.start).getTime() + impl.duration < new Date().getTime();
  },
};

export default handler;
