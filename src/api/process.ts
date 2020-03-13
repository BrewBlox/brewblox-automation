import { Middleware } from 'koa';
import Router from 'koa-router';

import { processDb } from '../database';
import logger from '../logger';
import { lastErrors, validateProcess } from '../validation';

const validate: Middleware = async (ctx, next) => {
  if (!validateProcess(ctx.request.body)) {
    const message = lastErrors().map(e => e.message).join(', ');
    logger.error(message);
    logger.debug('%o', ctx.request.body);
    ctx.throw(422, message);
  }
  await next();
};

const router = new Router();

router.get('/all', async (ctx) => {
  ctx.body = await processDb.fetchAll();
});

router.post('/create', validate, async (ctx) => {
  ctx.body = await processDb.create(ctx.request.body);
  ctx.status = 201;
});

router.get('/read/:id', async (ctx) => {
  ctx.body = await processDb.fetchById(ctx.params.id);
});

router.post('/update', validate, async (ctx) => {
  ctx.body = await processDb.save(ctx.request.body);
});

router.post('/delete', validate, async (ctx) => {
  ctx.body = await processDb.remove(ctx.request.body);
});

export default router;
