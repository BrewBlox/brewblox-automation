import { ActionImpl, AutomationImpl, ConditionImpl } from '../types';
import BlockPatch from './block-patch';
import BlockValue from './block-value';
import JSApply from './js-apply';
import JSCheck from './js-check';
import TaskEdit from './task-edit';
import TaskStatus from './task-status';
import TimeAbsolute from './time-absolute';
import TimeElapsed from './time-elapsed';
import { ActionHandler, ConditionHandler, ItemHandler } from './types';
import Webhook from './webhook';

const actionHandlers: Record<ActionImpl['type'], ActionHandler> = {
  BlockPatch,
  JSApply,
  TaskEdit,
  Webhook,
};

const conditionHandlers: Record<ConditionImpl['type'], ConditionHandler> = {
  BlockValue,
  TaskStatus,
  TimeAbsolute,
  TimeElapsed,
  JSCheck,
};

const handlers: Record<AutomationImpl['type'], ItemHandler> = {
  ...actionHandlers,
  ...conditionHandlers,
};

export function getHandler(type: ActionImpl['type']): ActionHandler;
export function getHandler(type: ConditionImpl['type']): ConditionHandler;
export function getHandler(type: AutomationImpl['type']): ItemHandler;

export function getHandler(type: AutomationImpl['type']): ItemHandler {
  return handlers[type];
}
