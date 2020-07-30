import axios from 'axios';
import find from 'lodash/find';
import isArray from 'lodash/isArray';
import isBoolean from 'lodash/isBoolean';
import isNumber from 'lodash/isNumber';
import isPlainObject from 'lodash/isPlainObject';
import isString from 'lodash/isString';
import { NodeVM } from 'vm2';

import { eventbus } from './eventbus';
import { qtyFactory } from './quantity';
import { SandboxResult } from './shared-types';
import { Block } from './types';


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

export function sanitize(values: any, parse = true): any {
  const serialized = JSON.stringify(values ?? null, (_, v) => simpleValue(v));
  return parse ? JSON.parse(serialized) : serialized;
}

export async function sandboxApi() {
  const messages: any[] = [];
  const blocks: Block[] = eventbus
    .getSparks()
    .map(serviceId => eventbus.getBlocks(serviceId))
    .map(v => sanitize(v))
    .flat(1);

  const findBlock = (serviceId: string, blockId: string): Block | null => {
    return blocks.find(v => v.serviceId === serviceId && v.id === blockId) ?? null;
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
    qty: qtyFactory(print),
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
    async saveBlock(block: Block): Promise<Block> {
      const { id, serviceId } = block;
      const desc = `saveBlock({id: '${id}', serviceId: '${serviceId}', ...})`;
      print(desc, block);
      const resp = await axios.post<Block>(`http://${serviceId}:5000/${serviceId}/blocks/write`, block);
      const updated = resp.data;
      print(desc, 'result', updated);
      return updated;
    },
    async publishEvent(topic: string, data: any): Promise<void> {
      print(`publishEvent('${topic}', {...})`, data);
      await eventbus.publishRaw(topic, sanitize(data, false));
    },
  };
}

// Wrapping code in an async function lets scripts use await in top-level calls
// Intentionally kept as oneliner to avoid breaking line refs in error messages
const promisify = (code: string) => `return (async () => {${code}})()`;

export async function runIsolated(script: string): Promise<SandboxResult> {
  const sandbox = await sandboxApi();

  const vm = new NodeVM({
    console: 'redirect',
    wrapper: 'none',
    sandbox,
  });

  vm.on('console.log', sandbox.print);

  try {
    const returnValue = sanitize(await vm.run(promisify(script)));
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
