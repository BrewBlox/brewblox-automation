import Ajv from 'ajv';

// Run "npm run schemas" to generate these
import AutomationProcess from './schemas/AutomationProcess.json';
import AutomationRuntime from './schemas/AutomationRuntime.json';
import AutomationTask from './schemas/AutomationTask.json';
import EventbusMessage from './schemas/EventbusMessage.json';
import * as types from './types';

const ajv = new Ajv();

export const validateProcess = (data: types.AutomationProcess) =>
  ajv.validate(AutomationProcess, data);

export const validateRuntime = (data: types.AutomationRuntime) =>
  ajv.validate(AutomationRuntime, data);

export const validateTask = (data: types.AutomationTask) =>
  ajv.validate(AutomationTask, data);

export const validateMessage = (data: types.EventbusMessage) =>
  ajv.validate(EventbusMessage, data);

export const lastErrors = () => ajv.errors ?? [];
