import axios from 'axios';

import logger from '../logger';
import { WebhookImpl } from '../types';
import { ActionHandler } from './types';

/**
 * Send a HTTP request with defined config.
 */
const handler: ActionHandler<WebhookImpl> = {

  async prepare(opts) {
    void opts;
  },

  async apply({ impl }) {
    const { url, method, headers, body } = impl;
    const resp = await axios({
      url,
      method,
      headers,
      data: body,
    });
    logger.info(`${url} responds '${resp.statusText}'`);
  },
};

export default handler;
