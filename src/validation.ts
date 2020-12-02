import Ajv from 'ajv';
import { Middleware } from 'koa';

import logger from './logger';
import { schemas } from './schemas';
export { schemas } from './schemas';

// One of the values in the `schemas` object
export type SchemaType = typeof schemas[keyof typeof schemas];

const ajv = new Ajv();

export const lastErrors = () =>
  ajv.errors ?? [];

export const errorText = () =>
  ajv.errorsText();

export function validate<T>(schema: SchemaType, data: unknown): data is T {
  return ajv.validate(schema, data) as boolean;
}

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
