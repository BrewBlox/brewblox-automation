import Ajv from 'ajv';

// Run "npm run schemas" to generate these
import AutomationProcess from './schemas/AutomationProcess.json';
import AutomationStepJump from './schemas/AutomationStepJump.json';
import AutomationTask from './schemas/AutomationTask.json';
import AutomationTemplate from './schemas/AutomationTemplate.json';
import EventbusMessage from './schemas/EventbusMessage.json';
import * as types from './types';

const ajv = new Ajv();

export const validateTask = (data: types.AutomationTask) =>
  ajv.validate(AutomationTask, data);

export const validateTemplate = (data: types.AutomationTemplate) =>
  ajv.validate(AutomationTemplate, data);

export const validateProcess = (data: types.AutomationProcess) =>
  ajv.validate(AutomationProcess, data);

export const validateMessage = (data: types.EventbusMessage) =>
  ajv.validate(EventbusMessage, data);

export const validateJump = (data: types.AutomationStepJump) =>
  ajv.validate(AutomationStepJump, data);

export const lastErrors = () => ajv.errors ?? [];

export const errorText = () => ajv.errorsText();
