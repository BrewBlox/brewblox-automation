import Ajv from 'ajv';
import { Middleware } from 'koa';

import logger from './logger';
// Run "npm run schemas" to generate these
import AutomationProcess from './schemas/AutomationProcess.json';
import AutomationStepJump from './schemas/AutomationStepJump.json';
import AutomationTask from './schemas/AutomationTask.json';
import AutomationTemplate from './schemas/AutomationTemplate.json';
import EventbusMessage from './schemas/EventbusMessage.json';

const ajv = new Ajv();

export const schemas = {
  AutomationProcess,
  AutomationStepJump,
  AutomationTask,
  AutomationTemplate,
  EventbusMessage,
};

export const lastErrors = () =>
  ajv.errors ?? [];

export const errorText = () =>
  ajv.errorsText();

export const validate = (schema: any, data: any) =>
  ajv.validate(schema, data);

export const validatorMiddleware =
  (schema: any): Middleware => {
    return async (ctx, next) => {
      if (!ajv.validate(schema, ctx.request.body)) {
        const message = errorText();
        logger.error(message);
        logger.debug('%o', ctx.request.body);
        ctx.throw(422, message);
      }
      await next();
    };
  };
