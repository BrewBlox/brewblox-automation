
export interface StoreObject {
  id: string;
  _rev?: string;
}

type AutomationStatus = 'Created' | 'Started' | 'Done' | 'Cancelled' | 'Unknown';

export interface Timed {
  status: AutomationStatus;
  /** @nullable */
  start: number | null;
  /** @nullable */
  end: number | null;
}

export interface AutomationTask extends StoreObject {
  ref: string;
  title: string;
  source: string;
  message: string;
  status: AutomationStatus;
}

export interface AutomationAction<T extends {} = any> {
  id: string;
  type: string;
  enabled: boolean;
  opts: T;
}

export interface AutomationCondition<T extends {} = any> {
  id: string;
  type: string;
  enabled: boolean;
  opts: T;
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

export interface AutomationResult extends Timed {
  id: string;
  title: string;
  stepId: string;
}

export interface AutomationRuntime extends StoreObject, Timed {
  title: string;
  processId: string;
  results: AutomationResult[];
}
