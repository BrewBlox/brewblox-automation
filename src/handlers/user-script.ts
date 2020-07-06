import { runIsolated } from '../sandbox';
import { UserScriptImpl } from '../types';
import { ConditionHandler } from './types';


/**
 * Send a HTTP request with defined config.
 */
const handler: ConditionHandler<UserScriptImpl> = {

  async prepare(opts) {
    void opts;
  },

  async check({ impl }) {
    const retv = await runIsolated(impl.body);
    return retv.result === true; // Very strict equality check
  },
};

export default handler;
