import { v4 as uid } from 'uuid';

import { taskDb } from '../database';
import { TaskCreateImpl } from '../types';
import { ActionHandler } from './types';

/**
 * Create a new Task object.
 * This will be a guaranteed unique object.
 * It is possible to create two tasks with the same ref.
 */
const handler: ActionHandler<TaskCreateImpl> = {
  async apply({ impl }, { proc, activeStep }) {
    const { ref, title, message } = impl;
    await taskDb.create({
      id: uid(),
      ref,
      title,
      message,
      status: 'Created',
      processId: proc.id,
      stepId: activeStep.id,
      createdBy: 'Action',
    });
  },
};

export default handler;
