////////////////////////////////////////////////////////////////
// Local
////////////////////////////////////////////////////////////////

export interface StoreObject {
  id: string;
  _rev?: string;
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

export interface Block {
  id: string;
  nid?: number;
  type: string;
  groups: number[];
  data: any;
}

////////////////////////////////////////////////////////////////
// Shared
////////////////////////////////////////////////////////////////

export type AutomationStatus =
  'Unknown'
  | 'Created'
  | 'Started'
  | 'Done'
  | 'Paused'
  | 'Cancelled'
  | 'Interrupted'
  | 'Invalid';

/** @nullable */
type Datum = Date | number | null;

////////////////////////////////////////////////////////////////
// Actions
////////////////////////////////////////////////////////////////

export interface BlockPatchImpl {
  type: 'BlockPatch';

  /** @nullable */
  serviceId: string | null;
  /** @nullable */
  blockId: string | null;
  /** @nullable */
  blockType: string | null;
  /** @nullable */
  data: any;
}

export interface TaskCreateImpl {
  type: 'TaskCreate';
  ref: string;
  title: string;
  message: string;
}

export type ActionImpl =
  BlockPatchImpl
  | TaskCreateImpl
  ;

////////////////////////////////////////////////////////////////
// Conditions
////////////////////////////////////////////////////////////////

export interface TimeAbsoluteImpl {
  type: 'TimeAbsolute';
  time: number | Date;
}

export interface TimeElapsedImpl {
  type: 'TimeElapsed';
  duration: number;
}

export interface BlockValueImpl {
  type: 'BlockValue';
  operator: 'lt' | 'le' | 'eq' | 'ne' | 'ge' | 'gt';

  /** @nullable */
  serviceId: string | null;
  /** @nullable */
  blockId: string | null;
  /** @nullable */
  blockType: string | null;
  /** @nullable */
  key: string | null;
  /** @nullable */
  value: any;
}

export interface TaskStatusImpl {
  type: 'TaskStatus';
  ref: string;
  status: AutomationStatus;
}

export interface ManualAdvanceImpl {
  type: 'ManualAdvance';
  desc: string;
}

export type ConditionImpl =
  TimeAbsoluteImpl
  | TimeElapsedImpl
  | BlockValueImpl
  | TaskStatusImpl
  | ManualAdvanceImpl
  ;

////////////////////////////////////////////////////////////////
// Generic
////////////////////////////////////////////////////////////////

export interface AutomationImpl {
  type: string;
}

export interface AutomationItem<T extends AutomationImpl = AutomationImpl> {
  id: string;
  title: string;
  enabled: boolean;
  impl: T;
}

export type AutomationAction<T extends ActionImpl = ActionImpl> = AutomationItem<T>;
export type AutomationCondition<T extends ConditionImpl = ConditionImpl> = AutomationItem<T>;

export interface AutomationTransition {
  id: string;
  /**
   * true: next step
   * false: exit process
   * string: step ID
   */
  next: boolean | string;
  enabled: boolean;
  conditions: AutomationCondition[];
}

export interface AutomationStep {
  id: string;
  title: string;
  enabled: boolean;
  actions: AutomationAction[];
  transitions: AutomationTransition[];
}

export interface AutomationStepResult {
  id: string;
  title: string;
  stepId: string;
  start: Datum;
  end: Datum;
  status: AutomationStatus;
}

export interface AutomationTask extends StoreObject {
  ref: string;
  title: string;
  message: string;
  status: AutomationStatus;
  source?: {
    processId: string;
    stepId: string;
  };
}

export interface AutomationTemplate extends StoreObject {
  title: string;
  steps: AutomationStep[];
}

export interface AutomationProcess extends AutomationTemplate {
  start: Datum;
  end: Datum;
  status: AutomationStatus;
  results: AutomationStepResult[];
}
