import { ActionImpl, ConditionImpl } from '../types';
import BlockPatch from './block-patch';
import BlockValue from './block-value';
import TaskCreate from './task-create';
import TaskStatus from './task-status';
import TimeAbsolute from './time-absolute';
import TimeElapsed from './time-elapsed';
import { ActionHandler, ConditionHandler } from './types';
import Webhook from './webhook';

export const actionHandlers: Record<ActionImpl['type'], ActionHandler> = {
  BlockPatch,
  TaskCreate,
  Webhook,
};

export const conditionHandlers: Record<ConditionImpl['type'], ConditionHandler> = {
  BlockValue,
  TaskStatus,
  TimeAbsolute,
  TimeElapsed,
};
