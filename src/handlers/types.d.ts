import { ActionImpl, AutomationAction, ConditionImpl, AutomationCondition } from "../types";

export interface ActionHandler<T extends ActionImpl = ActionImpl> {
  apply: (item: AutomationAction<T>) => Promise<void>;
}

export interface ConditionHandler<T extends ConditionImpl = ConditionImpl> {
  check: (item: AutomationCondition<T>) => Promise<boolean>;
}
