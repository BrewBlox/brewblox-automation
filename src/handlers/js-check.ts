import { runIsolated } from '../sandbox';
import { JSCheckImpl } from '../types';
import { ConditionHandler } from './types';


/**
 * Send a HTTP request with defined config.
 */
const handler: ConditionHandler<JSCheckImpl> = {

  async prepare(opts) {
    void opts;
  },

  async check({ impl }) {
    const result = await runIsolated(impl.body);

    // Very strict equality check
    // truthy objects such as {} or 'false' must not evaluate true
    return result.returnValue === true;
  },
};

export default handler;
