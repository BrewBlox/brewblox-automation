import { taskDb } from '../database';
import { TaskStatusImpl } from '../types';
import { ConditionHandler } from './types';

/**
 * Check status for all tasks with given ref.
 * Only tasks from the current process are considered.
 */
const handler: ConditionHandler<TaskStatusImpl> = {
  async check({ impl }, { proc }) {
    const tasks = (await taskDb.fetchAll())
      .filter(t => t.source?.processId === proc.id && t.ref === impl.ref);

    return tasks.every(t => t.status === impl.status);
  },
};

export default handler;
