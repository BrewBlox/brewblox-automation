import toPairs from 'lodash/toPairs';
import mqtt, { IClientPublishOptions } from 'mqtt';
import parseDuration from 'parse-duration';

import args from './args';
import { automationStateType, sparkStateType } from './getters';
import logger from './logger';
import { AutomationEvent, AutomationEventData, SparkPatchEvent, SparkStateEvent, StateEvent } from './shared-types';
import {
  Block,
  CacheMessage,
} from './types';
import { errorText, schemas, validate } from './validation';

const stateTopic = 'brewcast/state';
const publishTopic = 'brewcast/state/automation';

const stateMessage = (data: AutomationEventData): AutomationEvent => ({
  key: args.name,
  type: automationStateType,
  ttl: '60s',
  data,
});

// const isStateMessage = (obj: EventbusMessage): obj is EventbusStateMessage =>
//   obj instanceof Object
//   && 'type' in obj;

const isExpired = (msg: CacheMessage): boolean =>
  msg.received + parseDuration(msg.ttl) < new Date().getTime();

export class EventbusClient {
  private client: mqtt.Client | null = null;
  private cache: Record<string, CacheMessage> = {};

  public getAllCached(): CacheMessage[] {
    return toPairs(this.cache).map(([topic, msg]) => ({ ...msg, topic }));
  }

  public getCached(topic: string): CacheMessage | null {
    const msg = this.cache[topic];
    if (!msg || isExpired(msg)) {
      return null;
    }
    return msg;
  }

  public getBlocks(serviceId?: string): Block[] {
    return Object.values(this.cache)
      .filter((msg): msg is CacheMessage<SparkStateEvent> =>
        msg.type === sparkStateType
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
      this.client?.subscribe(stateTopic + '/#');
    });
    this.client.on('message', (topic: string, body: Buffer) => {
      if (body && body.length > 0) {
        this.onMessage(topic, JSON.parse(body.toString()));
      }
    });
  }

  private onMessage(topic: string, msg: unknown): void {
    if (topic === publishTopic) {
      return; // Skip messages published by this service
    }
    if (validate<SparkPatchEvent>(schemas.SparkPatchEvent, msg)) {
      const state = this.cache[msg.key] as CacheMessage<SparkStateEvent>;
      if (state) {
        const { blocks } = state.data;
        const { changed, deleted } = msg.data;
        const affected = [
          ...changed.map(block => block.id),
          ...deleted,
        ];
        state.data.blocks = [
          ...blocks.filter(v => !affected.includes(v.id)),
          ...changed,
        ];
      }
    }
    else if (validate<StateEvent>(schemas.StateEvent, msg)) {
      this.cache[topic] = {
        ...msg,
        topic,
        received: new Date().getTime(),
      };
    }
    else {
      logger.warn(`Discarded state message from '${topic}'`);
      logger.warn(errorText());
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
