////////////////////////////////////////////////////////////////
// Local
////////////////////////////////////////////////////////////////

export * from './shared-types';
import { AutomationProcess, AutomationStep, AutomationStepResult } from './shared-types';

export interface EventbusMessage {
  key: string;
  type: string;
  ttl: string;
  data: any;
}

export interface CachedMessage extends EventbusMessage {
  received: number;
}

export interface Block {
  id: string;
  nid?: number;
  type: string;
  groups: number[];
  data: any;
}

export interface HandlerOpts {
  proc: AutomationProcess;
  activeStep: AutomationStep;
  activeResult: AutomationStepResult;
}
