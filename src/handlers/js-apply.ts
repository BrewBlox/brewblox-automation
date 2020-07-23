import { runIsolated } from '../sandbox';
import { JSApplyImpl } from '../shared-types';
import { ActionHandler } from './types';

/**
 * Send a HTTP request with defined config.
 */
const handler: ActionHandler<JSApplyImpl> = {

  async prepare(opts) {
    void opts;
  },

  async apply({ impl }) {
    await runIsolated(impl.body);
  },
};

export default handler;
