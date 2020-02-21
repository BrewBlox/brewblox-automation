
export interface StoreObject {
  id: string;
  _rev?: string;
}

type AutomationStatus = 'Created' | 'Started' | 'Done' | 'Cancelled' | 'Unknown';

/** @nullable */
type Datum = Date | number | null;

// Conditions
////////////////

export interface TimeAbsolute {
  type: 'TimeAbsolute';
  time: number | Date;
}

export interface TimeElapsed {
  type: 'TimeElapsed';
  duration: number;
}

export interface BlockValue {
  type: 'BlockValue';
  blockId: string;
  serviceId: string;
  blockType: string;
  key: string;
  operator: 'lt' | 'le' | 'eq' | 'ne' | 'ge' | 'gt';
  value: any;
}

export interface TaskStatus {
  type: 'TaskStatus';
  ref: string;
  status: AutomationStatus;
}

export interface ManualAdvance {
  type: 'ManualAdvance';
  desc: string;
}

export type ConditionImpl =
  TimeAbsolute
  | TimeElapsed
  | BlockValue
  | TaskStatus
  | ManualAdvance
  ;

// Actions
/////////////

export interface BlockPatch {
  type: 'BlockPatch';
  blockId: string;
  serviceId: string;
  blockType: string;
  data: any;
}

export interface TaskCreate {
  type: 'TaskCreate';
  ref: string;
  title: string;
  message: string;
}

export type ActionImpl =
  BlockPatch
  | TaskCreate
  ;

// Generic
//////////////

export interface AutomationTask extends StoreObject {
  ref: string;
  title: string;
  message: string;
  status: AutomationStatus;
  source?: {
    runtimeId: string;
    stepId: string;
  };
}

export interface AutomationAction {
  id: string;
  title: string;
  enabled: boolean;
  impl: ActionImpl;
}

export interface AutomationCondition {
  id: string;
  title: string;
  enabled: boolean;
  impl: ConditionImpl;
}

export interface AutomationNote {
  id: string;
  title: string;
  message: string;
}

export interface AutomationStep {
  id: string;
  title: string;
  enabled: boolean;
  actions: AutomationAction[];
  conditions: AutomationCondition[];
  notes: AutomationNote[];
}

export interface AutomationProcess extends StoreObject {
  title: string;
  steps: AutomationStep[];
}

export interface AutomationResult {
  id: string;
  title: string;
  stepId: string;
  start: Datum;
  end: Datum;
  status: AutomationStatus;
}

export interface AutomationRuntime extends StoreObject {
  title: string;
  processId: string;
  results: AutomationResult[];
  start: Datum;
  end: Datum;
  status: AutomationStatus;
}

export interface EventbusMessage {
  key: string;
  type: string;
  duration: string;
  data: any;
}

export interface CachedMessage extends EventbusMessage {
  expires: number;
}
