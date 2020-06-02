import mqtt from 'mqtt';
import parseDuration from 'parse-duration';

import { blockEventType } from './getters';
import logger from './logger';
import { Block, CachedMessage, EventbusMessage } from './types';
import { errorText, validateMessage } from './validation';

const publishTopic = 'brewcast/state/automation';
const subscribeTopic = 'brewcast/state/#';

export class EventbusClient {
  private client: mqtt.Client | null = null;
  private cache: Record<string, CachedMessage> = {};

  public getCached(key: string, type: string): any | null {
    const msg = this.cache[`${key}__${type}`];
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
      path: '/ws',
    };
    this.client = mqtt.connect(undefined, opts);

    this.client.on('error', e => logger.error(`mqtt error: ${e}`));
    this.client.on('connect', () => this.client.subscribe(subscribeTopic));
    this.client.on('message', (topic, body) => this.onMessage(topic, JSON.parse(body.toString())));
  }

  private onMessage(topic: string, message: EventbusMessage): void {
    if (topic === publishTopic) {
      return;
    }
    if (!validateMessage(message)) {
      logger.warn(`Discarded eventbus message from '${message.key}'`);
      logger.warn(errorText());
      return;
    }

    this.cache[`${message.key}__${message.type}`] = {
      ...message,
      received: new Date().getTime(),
    };
  }

  public async publish(msg: EventbusMessage): Promise<void> {
    if (this.client) {
      this.client.publish(publishTopic, JSON.stringify(msg));
    }
  }
}

export const eventbus = new EventbusClient();
