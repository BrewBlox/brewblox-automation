import axios from 'axios';

import { eventbus } from '../eventbus';
import { BlockPatchImpl } from '../types';
import { ActionHandler } from './types';

const stripPostFix = (key: string) => key.replace(/[\[<].+/, '');

/**
 * Merge existing block data with the given change set.
 */
const handler: ActionHandler<BlockPatchImpl> = {
  async apply({ impl, title }) {
    if (impl.serviceId == null || impl.blockId == null) {
      return;
    }

    const block = eventbus.getBlocks(impl.serviceId)
      .find(v => v.id === impl.blockId);

    if (!block) {
      throw new Error(`Block ${impl.serviceId}::${impl.blockId} not found when applying ${title}`);
    }

    // Filter keys with the same root but a different postfix
    // We want 'key[min]' in impl.data to override 'key[s]' in block data
    const baseKeys = Object.keys(impl.data).map(k => stripPostFix(k));
    const blockData = {};
    Object.entries(block.data)
      .filter(([k]) => !baseKeys.includes(stripPostFix(k)))
      .forEach(([k, v]) => blockData[k] = v);

    await axios.put(`http://${impl.serviceId}:5000/${impl.serviceId}/objects/${encodeURIComponent(impl.blockId)}`, {
      ...block,
      data: {
        ...blockData,
        ...impl.data,
      },
    });
  },
};

export default handler;
