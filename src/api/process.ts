import { Middleware } from 'koa';
import Router from 'koa-router';
import isString from 'lodash/isString';
import { v4 as uid } from 'uuid';

import { processDb, taskDb } from '../database';
import logger from '../logger';
import { processor } from '../processor';
import {
  AutomationProcess,
  AutomationStepJump,
  AutomationTemplate,
  AutomationTransition,
  UUID,
} from '../types';
import { schemas, validatorMiddleware } from '../validation';

const validateJumpBody = validatorMiddleware(schemas.AutomationStepJump);
const validateTemplateBody = validatorMiddleware(schemas.AutomationTemplate);

const replaceId = <T extends { id: UUID }>(obj: T): T => ({ ...obj, id: uid() });

export const createProcess: Middleware = async (ctx, next) => {
  const template: AutomationTemplate = ctx.request.body;

  // Record<oldId, newId>
  const stepIds: Record<UUID, UUID> = {};
  template.steps.forEach(step => stepIds[step.id] = uid());

  const verifyTransitionNext = (trans: AutomationTransition): AutomationTransition => {
    if (!isString(trans.next)) {
      return trans;
    }
    const next = stepIds[trans.next];
    if (next === undefined) {
      throw new Error(`Transition target '${trans.next}' doesn't exist`);
    }
    return { ...trans, next };
  };

  try {
    const proc: AutomationProcess = {
      ...template,
      id: uid(),
      steps: template.steps
        .map(step => ({
          ...step,
          id: stepIds[step.id],
          preconditions: step.preconditions.map(replaceId),
          actions: step.actions.map(replaceId),
          transitions: step.transitions
            .map(verifyTransitionNext)
            .map(replaceId)
            .map(trans => ({
              ...trans,
              conditions: trans.conditions.map(replaceId),
            })),
        })),
      results: [],
    };
    ctx.request.body = proc;
  }
  catch (e) {
    logger.error(e.message);
    logger.debug('%o', ctx.request.body);
    ctx.throw(422, e);
  }
  await next();
};

const router = new Router();

router.get('/all', async (ctx) => {
  ctx.body = await processDb.fetchAll();
});

router.get('/read/:id', async (ctx) => {
  ctx.body = await processDb.fetchById(ctx.params.id);
});

router.post('/init', validateTemplateBody, createProcess, async (ctx) => {
  ctx.body = await processDb.create(ctx.request.body);
  ctx.status = 201;
});

router.post('/jump', validateJumpBody, async (ctx) => {
  const jump: AutomationStepJump = ctx.request.body;
  const proc = await processDb.fetchById(jump.processId);
  if (!proc?.steps.find(step => step.id === jump.stepId)) {
    ctx.throw(422, 'Invalid process ID or step ID');
  }
  processor.scheduleStepJump(jump);
  ctx.body = proc;
});

router.delete('/delete/:id', async (ctx) => {
  const procs = await processDb.fetchAll();
  const tasks = await taskDb.fetchAll();
  await Promise.all(
    procs
      .filter(v => v.id === ctx.params.id)
      .map(v => processDb.remove(v)));
  await Promise.all(
    tasks
      .filter(v => v.processId === ctx.params.id)
      .map(v => taskDb.remove(v)));
  ctx.status = 200;
});

export default router;
