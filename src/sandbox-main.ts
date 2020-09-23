import axios from 'axios';
import mqtt from 'mqtt';
import { NodeVM } from 'vm2';

import { addInterceptors, sanitize } from './functional';
import { qtyFactory } from './quantity';
import { Block, SandboxInput, SandboxOutput } from './types';

// We're in a different process than main.ts
// Add interceptors here as well
addInterceptors(axios);

const eventbusClient = mqtt.connect('mqtt://eventbus');

// Send data back to parent process
// If the `send` function doesn't exist,
// we want to raise an error anyway
const send = (data: SandboxOutput) => process.send!(data);

// Wrapping code in an async function lets scripts use await in top-level calls
// Intentionally kept as oneliner to avoid breaking line refs in error messages
const promisify = (code: string) => `return (async () => {${code}})()`;

async function run(data: SandboxInput) {
  const messages: any[] = [];
  const { id, script, blocks, events } = data;

  const findBlock = (serviceId: string, blockId: string): Block | null => {
    return blocks.find(v => v.serviceId === serviceId && v.id === blockId) ?? null;
  };

  const print = (...args: any[]) => {
    const data = args.length > 1 ? args : args[0];
    const message = sanitize(data);
    messages.push(message);
    send({ id, message });
  };

  const sandbox = {
    messages,
    blocks,
    print,
    axios,
    events,
    qty: qtyFactory(print),
    getBlock(serviceId: string, blockId: string): Block | null {
      const block = findBlock(serviceId, blockId);
      print(`getBlock('${serviceId}', '${blockId}')`, block);
      return block;
    },
    getBlockField(serviceId: string, blockId: string, field: string): any | null {
      const value = findBlock(serviceId, blockId)?.data[field] ?? null;
      print(`getField('${serviceId}', '${blockId}', '${field}')`, value);
      return value;
    },
    async saveBlock(block: Block): Promise<Block> {
      const { id, serviceId } = block;
      const desc = `saveBlock({id: '${id}', serviceId: '${serviceId}', ...})`;
      print(desc, block);
      const updated = await axios
        .post<Block>(`http://${serviceId}:5000/${serviceId}/blocks/write`, block)
        .then(resp => resp.data);
      print(desc, 'result', updated);
      return updated;
    },
    publishEvent(topic: string, data: any): Promise<void> {
      return new Promise((resolve, reject) => {
        print(`publishEvent('${topic}', {...})`, data);
        eventbusClient.publish(topic, sanitize(data, false), (err?: Error) => {
          if (err) { reject(err); }
          else { resolve(); }
        });
      });
    },
  };

  const vm = new NodeVM({
    console: 'redirect',
    wrapper: 'none',
    sandbox,
  });

  vm.on('console.log', sandbox.print);

  try {
    const result = sanitize(await vm.run(promisify(script)));
    send({ id, result });
  }
  catch (e) {
    const error = {
      message: e.message,
      line: Number(e.stack.match(/.*vm\.js:(\d+).*/)?.[1] ?? null),
    };
    send({ id, error });
  }
}

process.on('message', (data: SandboxInput) => run(data));
