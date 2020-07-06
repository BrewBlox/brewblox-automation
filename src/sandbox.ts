import isArray from 'lodash/isArray';
import isBoolean from 'lodash/isBoolean';
import isNumber from 'lodash/isNumber';
import isPlainObject from 'lodash/isPlainObject';
import isString from 'lodash/isString';
import { NodeVM } from 'vm2';

import { eventbus } from './eventbus';
import { Block } from './types';


interface GlobalBlock extends Block {
  serviceId: string;
}

export interface SandboxResult {
  result: any;
  logs: any[];
  error?: string;
};

const checks: ((v: any) => boolean)[] = [
  v => v == null,
  isString,
  isNumber,
  isBoolean,
  isArray,
  isPlainObject,
];

const simpleValue = (val: any) =>
  checks.some(f => f(val))
    ? val
    : `[${typeof val}]`;

export function sanitize(values: any): any {
  return JSON.parse(JSON.stringify(values, (_, v) => simpleValue(v)));
}

export async function sandboxApi(): Promise<any> {
  const blocks: GlobalBlock[] = eventbus
    .getSparks()
    .map(serviceId => eventbus.getBlocks(serviceId).map(block => ({ ...block, serviceId })))
    .flat(1);

  const findBlock = (serviceId: string, blockId: string): Block | null => {
    return blocks.find(v => v.serviceId === serviceId && v.id === blockId);
  };

  return {
    blocks,
    getBlock(serviceId: string, blockId: string): Block | null {
      return findBlock(serviceId, blockId);
    },
    getField(serviceId: string, blockId: string, field: string) {
      return findBlock(serviceId, blockId)?.data[field] ?? null;
    },
  };
}

export async function runIsolated(script: string): Promise<SandboxResult> {
  const api = await sandboxApi();

  const logs: any[] = [];
  const print = (...args: any[]) => {
    const data = args.length > 1 ? args : args[0];
    logs.push(sanitize(data));
  };

  const vm = new NodeVM({
    console: 'redirect',
    wrapper: 'none',
    sandbox: { ...api, print },
  });

  vm.on('console.log', print);

  try {
    const result = vm.run(script);
    return { result, logs };
  }
  catch (e) {
    return { result: null, logs, error: e.message };
  }
}
