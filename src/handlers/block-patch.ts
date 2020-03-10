import { BlockPatchImpl } from '../types';
import { ActionHandler } from './types';

const handler: ActionHandler<BlockPatchImpl> = {
  async apply(item) {
    void item;
  },
};

export default handler;
