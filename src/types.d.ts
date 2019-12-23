export interface DbStored {
  _id: string;
  _rev?: string;
  _deleted?: boolean;
}

type AutomationStatus = 'Created' | 'Started' | 'Completed' | 'Cancelled' | 'Unknown';

export interface AutomationTask extends DbStored {
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

export interface AutomationProcess extends DbStored {
  title: string;
  steps: AutomationStep[];
}

export interface AutomationResult {
  id: string;
  title: string;
  stepId: string;
  start: number | null;
  end: number | null;
  status: AutomationStatus;
}

export interface AutomationRuntime extends DbStored {
  title: string;
  start: number | null;
  end: number | null;
  status: AutomationStatus;
  processId: string;
  results: AutomationResult[];
}
