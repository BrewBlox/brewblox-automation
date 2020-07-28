import { v4 as uid } from 'uuid';

import { taskDb } from '../database';
import { AutomationTask, TaskEditImpl } from '../types';
import { ActionHandler } from './types';

/**
 * Create or edit a task.
 * If a task with given ref already exists, it is modified.
 */
const handler: ActionHandler<TaskEditImpl> = {

  async prepare(opts) {
    void opts;
  },

  async apply({ impl }, { proc, activeStep }) {
    const { ref, title, message, status } = impl;
    const existing: AutomationTask[] = ref
      ? (await taskDb.fetchAll())
        .filter(v => v.processId === proc.id && v.ref === ref)
      : [];

    for (const task of existing) {
      await taskDb.save({
        ...task,
        title: title ?? task.title,
        message: message ?? task.message,
        status: status ?? task.status,
      });
    }

    if (existing.length === 0) {
      await taskDb.create({
        id: uid(),
        ref,
        title: title ?? 'New task',
        message: message ?? `This task was automatically created by the '${title ?? 'New task'}' action.`,
        status: status ?? 'Created',
        processId: proc.id,
        stepId: activeStep.id,
        createdBy: 'Action',
      });
    }
  },
};

export default handler;
