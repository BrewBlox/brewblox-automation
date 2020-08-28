////////////////////////////////////////////////////////////////
// Local
////////////////////////////////////////////////////////////////

import {
  AutomationProcess,
  AutomationStep,
  AutomationStepResult,
  AutomationTask,
} from './shared-types';

interface HasId {
  id: string;
}

export interface EventbusStateMessage {
  key: string;
  type: string;
  ttl: string;
  data: any;
}

export interface EventbusHistoryMessage {
  key: string;
  data: any;
}

export type EventbusMessage =
  | EventbusStateMessage
  | EventbusHistoryMessage

export type CacheMessage<T extends EventbusMessage = EventbusMessage> = T & {
  topic: string;
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

export interface SparkStateMessage extends EventbusStateMessage {
  data: {
    service: any;
    blocks: Block[];
  }
}

export interface AutomationStateMessage extends EventbusStateMessage {
  data: {
    processes: AutomationProcess[];
    tasks: AutomationTask[];
  }
}

export interface JSONBloxField {
  __bloxtype: string;
}

export interface JSONQuantity extends JSONBloxField {
  __bloxtype: 'Quantity';
  value: number | null;
  unit: string;
  readonly?: boolean;
}

export interface JSONLink extends JSONBloxField {
  __bloxtype: 'Link';
  id: string | null;
  type: string;
  driven?: boolean;
}
