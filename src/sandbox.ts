import axios from 'axios';
import find from 'lodash/find';
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

const stripPostfix = (v: string): string =>
  v.replace(/(\[.+\]|<.+>)$/, '');

export function sanitize(values: any): any {
  return JSON.parse(JSON.stringify(values ?? null, (_, v) => simpleValue(v)));
}

export async function sandboxApi() {
  const messages: any[] = [];
  const blocks: GlobalBlock[] = eventbus
    .getSparks()
    .map(serviceId => eventbus.getBlocks(serviceId).map(block => ({ ...block, serviceId })))
    .flat(1);

  const findBlock = (serviceId: string, blockId: string): Block | null => {
    return blocks.find(v => v.serviceId === serviceId && v.id === blockId);
  };

  const print = (...args: any[]) => {
    const data = args.length > 1 ? args : args[0];
    messages.push(sanitize(data));
  };

  return {
    messages,
    blocks,
    print,
    axios,
    getBlock(serviceId: string, blockId: string): Block | null {
      const block = findBlock(serviceId, blockId);
      print(`getBlock('${serviceId}', '${blockId}')`, block);
      return block;
    },
    getBlockField(serviceId: string, blockId: string, field: string): any | null {
      const data = findBlock(serviceId, blockId)?.data ?? {};
      const value = find(data, (_, k) => field === k || field === stripPostfix(k)) ?? null;
      print(`getField('${serviceId}', '${blockId}', '${field}')`, value);
      return value;
    },
  };
}

export async function runIsolated(script: string): Promise<SandboxResult> {
  const sandbox = await sandboxApi();

  const vm = new NodeVM({
    console: 'redirect',
    wrapper: 'none',
    sandbox,
  });

  vm.on('console.log', sandbox.print);

  try {
    const returnValue = sanitize(await vm.run(script));
    return {
      date: new Date().getTime(),
      messages: sandbox.messages,
      returnValue,
    };
  }
  catch (e) {
    return {
      date: new Date().getTime(),
      messages: sandbox.messages,
      returnValue: null,
      error: {
        message: e.message,
        line: Number(e.stack.match(/.*vm\.js:(\d+).*/)?.[1] ?? null),
      },
    };
  }
}
