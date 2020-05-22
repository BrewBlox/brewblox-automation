import { ActionImpl, AutomationImpl, ConditionImpl } from '../types';
import BlockPatch from './block-patch';
import BlockValue from './block-value';
import TaskEdit from './task-edit';
import TaskStatus from './task-status';
import TimeAbsolute from './time-absolute';
import TimeElapsed from './time-elapsed';
import { ActionHandler, ConditionHandler, ItemHandler } from './types';
import Webhook from './webhook';

export const actionHandlers: Record<ActionImpl['type'], ActionHandler> = {
  BlockPatch,
  TaskEdit,
  Webhook,
};

export const conditionHandlers: Record<ConditionImpl['type'], ConditionHandler> = {
  BlockValue,
  TaskStatus,
  TimeAbsolute,
  TimeElapsed,
};

export const handlers: Record<AutomationImpl['type'], ItemHandler> = {
  ...actionHandlers,
  ...conditionHandlers,
};
