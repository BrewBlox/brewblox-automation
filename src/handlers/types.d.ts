import {
  ActionImpl,
  AutomationAction,
  ConditionImpl,
  AutomationCondition,
  HandlerOpts,
  AutomationImpl,
  AutomationItem,
} from "../types";

export interface ItemHandler<T extends AutomationImpl = AutomationImpl> {
  prepare: (item: AutomationItem<T>, opts: HandlerOpts) => Promise<void>;
}

export interface ActionHandler<T extends ActionImpl = ActionImpl> extends ItemHandler<T> {
  apply: (item: AutomationAction<T>, opts: HandlerOpts) => Promise<void>;
}

export interface ConditionHandler<T extends ConditionImpl = ConditionImpl> extends ItemHandler<T> {
  check: (item: AutomationCondition<T>, opts: HandlerOpts) => Promise<boolean>;
}
