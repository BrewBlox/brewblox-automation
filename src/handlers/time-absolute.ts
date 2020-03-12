import { TimeAbsoluteImpl } from '../types';
import { ConditionHandler } from './types';

const handler: ConditionHandler<TimeAbsoluteImpl> = {
  async check({ impl }) {
    return !impl.time || new Date().getTime() > new Date(impl.time).getTime();
  },
};

export default handler;
