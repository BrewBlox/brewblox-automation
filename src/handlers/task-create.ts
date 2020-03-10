import { TaskCreateImpl } from '../types';
import { ActionHandler } from './types';

const handler: ActionHandler<TaskCreateImpl> = {
  async apply(item) {
    void item;
  },
};

export default handler;
