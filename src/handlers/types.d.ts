import { ActionImpl, AutomationAction, ConditionImpl, AutomationCondition, AutomationStep, AutomationProcess, AutomationStepResult } from "../types";

export interface HandlerOpts {
  proc: AutomationProcess;
  step: AutomationStep;
  result: AutomationStepResult;
}

export interface ActionHandler<T extends ActionImpl = ActionImpl> {
  apply: (item: AutomationAction<T>, opts: HandlerOpts) => Promise<void>;
}

export interface ConditionHandler<T extends ConditionImpl = ConditionImpl> {
  check: (item: AutomationCondition<T>, opts: HandlerOpts) => Promise<boolean>;
}
