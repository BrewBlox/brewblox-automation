import mqtt, { IClientPublishOptions } from 'mqtt';
import parseDuration from 'parse-duration';

import args from './args';
import { automationStateType, sparkStateType } from './getters';
import logger from './logger';
import { AutomationEvent, AutomationEventData, SparkPatchEvent, SparkStateEvent } from './shared-types';
import {
  Block,
  CacheMessage,
} from './types';
import { schemas, validate } from './validation';

const stateTopic = 'brewcast/state';
const publishTopic = 'brewcast/state/automation';
const ttl = parseDuration('1d');

const stateMessage = (data: AutomationEventData): AutomationEvent => ({
  key: args.name,
  type: automationStateType,
  data,
});

const isExpired = (msg: CacheMessage): boolean =>
  msg.received + ttl < new Date().getTime();

export class EventbusClient {
  private client: mqtt.Client | null = null;
  private cache: Record<string, CacheMessage> = {};

  public getAllCached(): CacheMessage[] {
    return Object
      .values(this.cache)
      .map(v => ({ ...v }));
  }

  public setCached<T>(topic: string, payload: T | null) {
    if (payload == null) {
      delete this.cache[topic];
    }
    else {
      this.cache[topic] = {
        topic,
        payload,
        received: new Date().getTime(),
      };
    }
  }

  public getCached<T>(topic: string): CacheMessage<T> | null {
    const msg = this.cache[topic] as CacheMessage<T> | undefined;
    if (!msg || isExpired(msg)) {
      return null;
    }
    return msg;
  }

  public getBlocks(serviceId?: string): Block[] {
    return Object.values(this.cache)
      .filter((msg): msg is CacheMessage<SparkStateEvent> => {
        const payload: SparkStateEvent = msg.payload as any;
        return payload.type === sparkStateType
          && (!serviceId || payload.key === serviceId)
          && !isExpired(msg);
      })
      .map(msg => msg.payload.data.blocks)
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
      this.client?.subscribe(stateTopic + '/#');
    });
    this.client.on('message', (topic: string, body: Buffer) => {
      if (body && body.length > 0) {
        this.onMessage(topic, JSON.parse(body.toString()));
      }
      else {
        this.onMessage(topic, null);
      }
    });
  }

  private onMessage(topic: string, payload: unknown | null): void {
    if (topic === publishTopic) {
      return; // Skip messages published by this service
    }

    this.setCached(topic, payload);

    // Handle patch events
    if (validate<SparkPatchEvent>(schemas.SparkPatchEvent, payload)) {
      const baseTopic = `brewcast/state/${payload.key}`;
      const base = this.getCached<SparkStateEvent>(baseTopic);
      if (base) {
        const { blocks } = base.payload.data;
        const { changed, deleted } = payload.data;
        const affected = [
          ...changed.map(block => block.id),
          ...deleted,
        ];
        base.payload.data.blocks = [
          ...blocks.filter(v => !affected.includes(v.id)),
          ...changed,
        ];
        this.setCached(baseTopic, base.payload);
      }
    }
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
