import sandbox from '../sandbox';
import { JSApplyImpl } from '../types';
import { ActionHandler } from './types';

/**
 * Send a HTTP request with defined config.
 */
const handler: ActionHandler<JSApplyImpl> = {

  async prepare(opts) {
    void opts;
  },

  async apply({ impl }) {
    await sandbox.run(impl.body);
  },
};

export default handler;
