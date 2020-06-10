import axios from 'axios';
import Router from 'koa-router';

const router = new Router();

router.post('/webhook', async (ctx) => {
  const { url, method, headers, body } = ctx.request.body;
  const { status, statusText, data } = await axios({
    url,
    method,
    headers,
    data: body,
  });
  ctx.body = { status, statusText, data };
  ctx.status = 200;
});

export default router;
