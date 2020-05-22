import { v4 as uid } from 'uuid';

import { taskDb } from '../database';
import { TaskStatusImpl } from '../types';
import { ConditionHandler } from './types';

/**
 * Check status for all tasks with given ref.
 * Only tasks from the current process are considered.
 */
const handler: ConditionHandler<TaskStatusImpl> = {

  async prepare({ impl, title }, { proc, activeStep }) {
    const { ref, resetStatus } = impl;
    const existing = (await taskDb.fetchAll())
      .filter(v => v.processId === proc.id && v.ref === ref);

    if (resetStatus !== null) {
      for (const task of existing) {
        await taskDb.save({
          ...task,
          status: resetStatus,
        });
      }
    }

    if (existing.length === 0) {
      await taskDb.create({
        id: uid(),
        ref: impl.ref,
        title: `${title} task`,
        message: `This task was automatically created by the '${title}' condition.`,
        status: impl.resetStatus ?? 'Created',
        createdBy: 'Condition',
        processId: proc.id,
        stepId: activeStep.id,
      });
    }
  },

  async check({ impl }, { proc }) {
    const tasks = (await taskDb.fetchAll())
      .filter(t => t.processId === proc.id && t.ref === impl.ref);
    return tasks.every(t => t.status === impl.status);
  },
};

export default handler;
