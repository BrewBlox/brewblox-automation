import isArray from 'lodash/isArray';
import isBoolean from 'lodash/isBoolean';
import isNumber from 'lodash/isNumber';
import isPlainObject from 'lodash/isPlainObject';
import isString from 'lodash/isString';
import { NodeVM } from 'vm2';

import { eventbus } from './eventbus';
import { SandboxResult } from './shared-types';
import { Block } from './types';


interface GlobalBlock extends Block {
  serviceId: string;
}

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

  const messages: any[] = [];
  const print = (...args: any[]) => {
    const data = args.length > 1 ? args : args[0];
    messages.push(sanitize(data));
  };

  const vm = new NodeVM({
    console: 'redirect',
    wrapper: 'none',
    sandbox: { ...api, print },
  });

  vm.on('console.log', print);

  try {
    const returnValue = vm.run(script);
    return {
      date: new Date().getTime(),
      returnValue,
      messages,
    };
  }
  catch (e) {
    const [[, line]] = [...e.stack.matchAll(/vm\.js:(\d+):/gi)];

    return {
      date: new Date().getTime(),
      returnValue: null,
      messages,
      error: {
        message: e.message,
        line: Number(line),
      },
    };
  }
}
