import isNumber from 'lodash/isNumber';
import isObject from 'lodash/isObject';
import round from 'lodash/round';

import { eventbus } from '../eventbus';
import { BlockValueImpl } from '../types';
import { ConditionHandler } from './types';

const compare: Record<BlockValueImpl['operator'], ((v1: any, v2: any) => boolean)> = {
  'lt': (v1, v2) => v1 < v2,
  'le': (v1, v2) => v1 <= v2,
  'eq': (v1, v2) => v1 === v2,
  'ne': (v1, v2) => v1 !== v2,
  'ge': (v1, v2) => v1 >= v2,
  'gt': (v1, v2) => v1 > v2,
};

interface Unit {
  __bloxtype: 'Unit';
  value: number;
  unit: string;
}

interface Link {
  __bloxtype: 'Link';
  id: string;
  type: string;
}

const isUnit = (obj: any): obj is Unit =>
  isObject(obj) && (obj as Unit).__bloxtype === 'Unit';

const isLink = (obj: any): obj is Link =>
  isObject(obj) && (obj as Link).__bloxtype === 'Link';

const resolveMeta = (obj: any): any => {
  if (isUnit(obj)) {
    return obj.value;
  }
  if (isLink(obj)) {
    return obj.id;
  }
  return obj;
};

/**
 * BlockValue compares the given value with the actual as received through events.
 *
 * If the address is not set, it will evaluate true.
 * If the block can't be found, it will evaluate false.
 */
const handler: ConditionHandler<BlockValueImpl> = {

  async prepare(opts) {
    void opts;
  },

  async check({ impl, title }) {
    // intentional loose compare
    if (impl.serviceId == null || impl.blockId == null) {
      return true;
    }

    const block = eventbus.getBlocks(impl.serviceId)
      .find(v => v.id === impl.blockId);

    if (!block) {
      throw new Error(`Block ${impl.serviceId}::${impl.blockId} not found when checking ${title}`);
    }

    const key = impl.key?.replace(/[\[<].*$/, '') ?? ''; // strip postfix
    let actual = resolveMeta(block.data[key]);
    let desired = resolveMeta(impl.value);

    if (actual === undefined || desired === undefined) {
      return false;
    }

    if (isNumber(actual) && isNumber(desired)) {
      actual = round(actual, 2);
      desired = round(desired, 2);
    }

    return compare[impl.operator](actual, desired);
  },
};

export default handler;
