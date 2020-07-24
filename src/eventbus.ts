import mqtt, { IClientPublishOptions } from 'mqtt';
import parseDuration from 'parse-duration';

import args from './args';
import { sparkStateType } from './getters';
import logger from './logger';
import { AutomationStateMessage, Block, CachedMessage, EventbusMessage } from './types';
import { errorText, validateMessage } from './validation';

const stateTopic = 'brewcast/state';
const publishTopic = 'brewcast/state/automation';
const stateType = 'automation.active';

const cacheKey = (obj: Pick<EventbusMessage, 'key' | 'type'>): string =>
  `${obj.key}__${obj.type}`;

const stateMessage = (data: AutomationStateMessage['data']): AutomationStateMessage => ({
  key: args.name,
  type: stateType,
  ttl: '60s',
  data,
});

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
    return this.getCached(serviceId, sparkStateType)?.blocks ?? [];
  }

  public getSparks(): string[] {
    return Object.values(this.cache)
      .filter(msg => msg.type === sparkStateType)
      .map(msg => msg.key);
  }

  public async connect(): Promise<void> {
    const emptyMessage = stateMessage({ processes: [], tasks: [] });
    const opts: mqtt.IClientOptions = {
      protocol: 'mqtt',
      host: 'eventbus',
      will: {
        topic: publishTopic,
        payload: JSON.stringify(emptyMessage),
        qos: 0,
        retain: true,
      },
    };
    this.client = mqtt.connect(undefined, opts);

    this.client.on('error', e => logger.error(`mqtt error: ${e}`));
    this.client.on('connect', () => this.client!.subscribe(stateTopic + '/#'));
    this.client.on('message', (topic: string, body: Buffer) => {
      if (body && body.length > 0) {
        this.onMessage(topic, JSON.parse(body.toString()));
      }
    });
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

  public async publishActive(data: AutomationStateMessage['data']) {
    if (this.client) {
      const payload = JSON.stringify(stateMessage(data));
      this.client.publish(publishTopic, payload, { retain: true });
    }
  }

  public async publishRaw(topic: string, payload: string, opts?: IClientPublishOptions) {
    if (this.client) {
      this.client.publish(topic, payload, opts!);
    }
  }
}

export const eventbus = new EventbusClient();
