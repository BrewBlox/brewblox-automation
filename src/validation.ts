import Ajv from 'ajv';

// Run "npm run schemas" to generate these
import AutomationProcess from './schemas/AutomationProcess.json';
import AutomationRuntime from './schemas/AutomationRuntime.json';
import AutomationTask from './schemas/AutomationTask.json';

const ajv = new Ajv();

export const validateProcess = (data: any) =>
  ajv.validate(AutomationProcess, data);

export const validateRuntime = (data: any) =>
  ajv.validate(AutomationRuntime, data);

export const validateTask = (data: any) =>
  ajv.validate(AutomationTask, data);

export const lastErrors = () => ajv.errors ?? [];
