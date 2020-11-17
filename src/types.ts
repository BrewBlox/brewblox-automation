export * from './shared-types';

////////////////////////////////////////////////////////////////
// Local
////////////////////////////////////////////////////////////////

import {
  AutomationProcess,
  AutomationStep,
  AutomationStepResult,
  Block,
  SandboxResult,
  StateEvent,
} from './shared-types';

export interface HasId {
  id: string;
}

export interface HistoryEvent {
  key: string;
  data: any;
}

export type CacheMessage<T extends StateEvent = StateEvent> = T & {
  topic: string;
  received: number;
}

export interface HandlerOpts {
  proc: AutomationProcess;
  activeStep: AutomationStep;
  activeResult: AutomationStepResult;
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

export interface SandboxInput {
  id: string;
  script: string;
  blocks: Block[];
  events: CacheMessage[];
}

export interface SandboxOutput {
  id: string;
  result?: any;
  error?: SandboxResult['error'];
  message?: any;
}
