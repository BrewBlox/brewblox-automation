////////////////////////////////////////////////////////////////
// Local
////////////////////////////////////////////////////////////////

export * from './shared-types';
import { AutomationProcess, AutomationStep, AutomationStepResult, AutomationTask } from './shared-types';

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
  serviceId: string;
  type: string;
  groups: number[];
  data: any;
}

export interface HandlerOpts {
  proc: AutomationProcess;
  activeStep: AutomationStep;
  activeResult: AutomationStepResult;
}

export interface SparkStateMessage extends EventbusMessage {
  data: {
    service: any;
    blocks: Block[];
  }
}

export interface AutomationStateMessage extends EventbusMessage {
  data: {
    processes: AutomationProcess[];
    tasks: AutomationTask[];
  }
}
