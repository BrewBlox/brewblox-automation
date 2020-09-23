import axios from 'axios';

import { eventbus } from '../eventbus';
import { parseObject } from '../postfixed';
import { Block, BlockPatchImpl } from '../types';
import { ActionHandler } from './types';

/**
 * Merge existing block data with the given change set.
 */
const handler: ActionHandler<BlockPatchImpl> = {

  async prepare(opts) {
    void opts;
  },

  async apply({ impl, title }) {
    if (impl.serviceId == null || impl.blockId == null) {
      return;
    }

    const block = eventbus.getBlocks(impl.serviceId)
      .find(v => v.id === impl.blockId);

    if (!block) {
      throw new Error(`Block ${impl.serviceId}::${impl.blockId} not found when applying ${title}`);
    }

    const resp = await axios.post<Block>(`http://${impl.serviceId}:5000/${impl.serviceId}/blocks/write`, {
      ...block,
      data: {
        ...block.data,
        ...parseObject(impl.data), // Parse data to convert postfixed notation to bloxfields
      },
    });
    eventbus.setCachedBlock(resp.data);
  },
};

export default handler;
