import axios from 'axios';
import { get } from 'lodash';

import app from './app';
import args from './args';
import { eventbus } from './eventbus';
import logger from './logger';
import { processor } from './processor';

logger.info('==========Startup==========');

eventbus.connect();
processor.start();

axios
  .interceptors
  .response
  .use(
    (response) => response,
    (e) => {
      const resp = get(e, 'response.data', e.message ?? null);
      const err = (resp instanceof Object) ? JSON.stringify(resp) : resp;
      const url = get(e, 'response.config.url');
      const method = get(e, 'response.config.method');
      const status = get(e, 'response.status');
      const msg = `[HTTP ERROR] method=${method}, url=${url}, status=${status}, response=${err}`;
      return Promise.reject(new Error(msg));
    });

app.listen(args.port, () => {
  logger.info(`App is running at http://0.0.0.0:${args.port}/${args.name}`);
});

