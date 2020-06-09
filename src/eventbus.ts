import mqtt from 'mqtt';
import parseDuration from 'parse-duration';

import args from './args';
import { blockEventType } from './getters';
import logger from './logger';
import { Block, CachedMessage, EventbusMessage } from './types';
import { errorText, validateMessage } from './validation';

const stateTopic = 'brewcast/state';

const cacheKey = (obj: Pick<EventbusMessage, 'key' | 'type'>): string =>
  `${obj.key}__${obj.type}`;

export class EventbusClient {
  private client: mqtt.Client | null = null;
  private cache: Record<string, CachedMessage> = {};

  public getCached(key: string, type: string): EventbusMessage['data'] | null {
    const msg = this.cache[cacheKey({ key, type })];
    if (msg === undefined) {
      return null;
    }
    if (msg.received + parseDuration(msg.ttl) < new Date().getTime()) {
      return null;
    }
    return msg.data;
  }

  public getBlocks(serviceId: string): Block[] {
    return this.getCached(serviceId, blockEventType) ?? [];
  }

  public async connect(): Promise<void> {
    const opts: mqtt.IClientOptions = {
      protocol: 'mqtt',
      host: 'eventbus',
    };
    this.client = mqtt.connect(undefined, opts);

    this.client.on('error', e => logger.error(`mqtt error: ${e}`));
    this.client.on('connect', () => this.client.subscribe(stateTopic + '/#'));
    this.client.on('message', (topic, body) => this.onMessage(topic, JSON.parse(body.toString())));
  }

  private onMessage(topic: string, message: EventbusMessage): void {
    if (!validateMessage(message)) {
      logger.warn(`Discarded eventbus message from '${topic}'`);
      logger.warn(errorText());
      return;
    }
    if (message.key === args.name) {
      return;
    }
    this.cache[cacheKey(message)] = {
      ...message,
      received: new Date().getTime(),
    };
  }

  public async publish(msg: EventbusMessage, opts?: mqtt.IClientPublishOptions): Promise<void> {
    if (this.client) {
      const topic = `${stateTopic}/${msg.type}`;
      this.client.publish(topic, JSON.stringify(msg), opts);
    }
  }
}

export const eventbus = new EventbusClient();
