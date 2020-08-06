import toPairs from 'lodash/toPairs';
import mqtt, { IClientPublishOptions } from 'mqtt';
import parseDuration from 'parse-duration';

import args from './args';
import { automationStateType, sparkStateType } from './getters';
import logger from './logger';
import {
  AutomationStateMessage,
  Block,
  CacheMessage,
  EventbusMessage,
  EventbusStateMessage,
} from './types';
import { errorText, validateMessage } from './validation';

const historyTopic = 'brewcast/history';
const stateTopic = 'brewcast/state';
const publishTopic = 'brewcast/state/automation';

const stateMessage = (data: AutomationStateMessage['data']): AutomationStateMessage => ({
  key: args.name,
  type: automationStateType,
  ttl: '60s',
  data,
});

const isStateMessage = (obj: EventbusMessage): obj is EventbusStateMessage =>
  obj instanceof Object
  && 'type' in obj;

const isExpired = (msg: CacheMessage): boolean =>
  isStateMessage(msg)
  && msg.received + parseDuration(msg.ttl) < new Date().getTime();

export class EventbusClient {
  private client: mqtt.Client | null = null;
  private cache: Record<string, CacheMessage> = {};

  public getAllCached(): CacheMessage[] {
    return toPairs(this.cache).map(([topic, msg]) => ({ ...msg, topic }));
  }

  public getCached(topic: string): CacheMessage | null {
    const msg = this.cache[topic];
    if (msg === undefined) {
      return null;
    }
    if (isStateMessage(msg) && isExpired(msg)) {
      return null;
    }
    return msg;
  }

  public getBlocks(serviceId?: string): Block[] {
    return Object.values(this.cache)
      .filter((msg): msg is CacheMessage<EventbusStateMessage> =>
        isStateMessage(msg)
        && msg.type === sparkStateType
        && (!serviceId || msg.key === serviceId)
        && !isExpired(msg))
      .map(msg => msg.data.blocks)
      .flat(1);
  }

  public connect(): void {
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

    this.client.on('error', e => {
      logger.error(`mqtt error: ${e}`);
    });
    this.client.on('connect', () => {
      logger.info('Eventbus connected');
      this.client?.subscribe(historyTopic + '/#');
      this.client?.subscribe(stateTopic + '/#');
    });
    this.client.on('message', (topic: string, body: Buffer) => {
      if (body && body.length > 0) {
        this.onMessage(topic, JSON.parse(body.toString()));
      }
    });
  }

  private onMessage(topic: string, message: EventbusStateMessage): void {
    if (topic === publishTopic) {
      return; // Skip messages published by this service
    }
    if (!validateMessage(message)) {
      logger.warn(`Discarded eventbus message from '${topic}'`);
      logger.warn(errorText());
      return;
    }
    this.cache[topic] = {
      ...message,
      topic,
      received: new Date().getTime(),
    };
  }

  public async publishActive(data: any) {
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
