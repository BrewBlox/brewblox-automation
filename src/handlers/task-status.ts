import { v4 as uid } from 'uuid';

import { taskDb } from '../database';
import { TaskStatusImpl } from '../types';
import { ConditionHandler } from './types';

/**
 * Check status for all tasks with given ref.
 * Only tasks from the current process are considered.
 */
const handler: ConditionHandler<TaskStatusImpl> = {
  async check({ impl, title }, { proc, activeStep }) {
    const tasks = (await taskDb.fetchAll())
      .filter(t => t.processId === proc.id && t.ref === impl.ref);

    if (tasks.length === 0) {
      await taskDb.create({
        id: uid(),
        ref: impl.ref,
        title: `${title} task`,
        message: `This task was automatically created by the '${title}' condition.`,
        status: 'Created',
        createdBy: 'Condition',
        processId: proc.id,
        stepId: activeStep.id,
      });
      // 'Created' is a valid desired status
      return impl.status === 'Created';
    }

    return tasks.every(t => t.status === impl.status);
  },
};

export default handler;
