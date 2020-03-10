import { TaskStatusImpl } from '../types';
import { ConditionHandler } from './types';

const handler: ConditionHandler<TaskStatusImpl> = {
  async check(item) {
    void item;
    return true;
  },
};

export default handler;
