import Router from 'koa-router';

import { taskDb } from '../database';
import { schemas, validatorMiddleware } from '../validation';

const validateTaskBody = validatorMiddleware(schemas.AutomationTask);

const router = new Router();

router.get('/all', async (ctx) => {
  ctx.body = await taskDb.fetchAll();
});

router.post('/create', validateTaskBody, async (ctx) => {
  ctx.body = await taskDb.save(ctx.request.body);
  ctx.status = 201;
});

router.get('/read/:id', async (ctx) => {
  ctx.body = await taskDb.fetchById(ctx.params.id);
});

router.post('/update', validateTaskBody, async (ctx) => {
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
