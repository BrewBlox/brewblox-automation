
export interface StoreObject {
  id: string;
  _rev?: string;
}

type AutomationStatus = 'Created' | 'Started' | 'Done' | 'Cancelled' | 'Unknown';

/** @nullable */
type Datum = Date | number | null;

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
