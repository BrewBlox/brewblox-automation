
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

export type ActualCondition =
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

export type ActualAction =
  BlockPatch
  | TaskCreate
  ;

// Generic
//////////////

export interface AutomationTask extends StoreObject {
  ref: string;
  title: string;
  source: string;
  message: string;
  status: AutomationStatus;
}

export interface AutomationAction {
  id: string;
  title: string;
  enabled: boolean;
  opts: ActualAction;
}

export interface AutomationCondition<T = any> {
  id: string;
  title: string;
  enabled: boolean;
  opts: ActualCondition;
}

export interface AutomationNote {
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
