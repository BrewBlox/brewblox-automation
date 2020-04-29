import { Middleware } from 'koa';
import Router from 'koa-router';

import { taskDb } from '../database';
import logger from '../logger';
import { errorText, validateTask } from '../validation';

const validate: Middleware = async (ctx, next) => {
  if (!validateTask(ctx.request.body)) {
    const message = errorText();
    logger.error(message);
    logger.debug('%o', ctx.request.body);
    ctx.throw(422, message);
  }
  await next();
};

const router = new Router();

router.get('/all', async (ctx) => {
  ctx.body = await taskDb.fetchAll();
});

router.post('/create', validate, async (ctx) => {
  ctx.body = await taskDb.create(ctx.request.body);
  ctx.status = 201;
});

router.get('/read/:id', async (ctx) => {
  ctx.body = await taskDb.fetchById(ctx.params.id);
});

router.post('/update', validate, async (ctx) => {
  ctx.body = await taskDb.save(ctx.request.body);
});

router.delete('/delete/:id', async (ctx) => {
  const tasks = await taskDb.fetchAll();
  await Promise.all(
    tasks
      .filter(v => v.id === ctx.params.id)
      .map(v => taskDb.remove(v)));
  ctx.status = 200;
});

export default router;
