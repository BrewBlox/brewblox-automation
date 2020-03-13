import { ActionImpl, ConditionImpl } from '../types';
import AlwaysFalse from './always-false';
import BlockPatch from './block-patch';
import BlockValue from './block-value';
import TaskCreate from './task-create';
import TaskStatus from './task-status';
import TimeAbsolute from './time-absolute';
import TimeElapsed from './time-elapsed';
import { ActionHandler, ConditionHandler } from './types';

export const actionHandlers: Record<ActionImpl['type'], ActionHandler> = {
  BlockPatch,
  TaskCreate,
};

export const conditionHandlers: Record<ConditionImpl['type'], ConditionHandler> = {
  BlockValue,
  AlwaysFalse,
  TaskStatus,
  TimeAbsolute,
  TimeElapsed,
};
