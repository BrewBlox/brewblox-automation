import amqplib, { Channel, Message } from 'amqplib';
import parseDuration from 'parse-duration';

import { blockEventType } from './getters';
import logger from './logger';
import { Block, CachedMessage, EventbusMessage } from './types';
import { lastErrors, validateMessage } from './validation';

const statusExchange = 'brewcast.state';
const publishKey = 'automation.output';

export class EventbusClient {
  private lastOk = true;
  private channel: Channel | null = null;
  private cache: Record<string, CachedMessage> = {};

  public getCached(key: string, type: string): any | null {
    const msg = this.cache[`${type}__${key}`];
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
    try {
      const conn = await amqplib.connect('amqp://eventbus:5672');
      conn.on('close', () => {
        logger.info('Eventbus closed');
        this.retry();
      });

      this.channel = await conn.createChannel();
      const queue = await this.channel.assertQueue('', { exclusive: true });

      await this.channel.assertExchange(statusExchange, 'topic', { autoDelete: true, durable: false });
      await this.channel.bindQueue(queue.queue, statusExchange, '#');
      await this.channel.consume(queue.queue, msg => this.onMessage(msg));

      this.lastOk = true;
      logger.info(`Starting eventbus sync: ${statusExchange}`);
    }
    catch (e) {
      if (this.lastOk) {
        logger.warn(`Failed to connect: ${e.message}`);
        this.lastOk = false;
      }
      this.retry();
    }
  }

  private retry(): void {
    setTimeout(() => this.connect(), 2000);
  }

  private onMessage(msg: Message): void {
    this.channel.ack(msg);
    if (msg.fields.routingKey === publishKey) {
      // Ignore messages sent by publish()
      return;
    }
    const message: EventbusMessage = JSON.parse(msg.content.toString());
    if (!validateMessage(message)) {
      logger.warn(`Discarded eventbus message from '${message.key}'`);
      logger.warn(lastErrors());
      return;
    }

    this.cache[`${message.key}__${message.type}`] = {
      ...message,
      received: new Date().getTime(),
    };
  }

  public async publish(msg: EventbusMessage): Promise<void> {
    if (this.channel) {
      await this.channel.assertExchange(statusExchange, 'topic', { autoDelete: true, durable: false });
      this.channel.publish(statusExchange, publishKey, Buffer.from(JSON.stringify(msg)));
    }
  }
}

export const eventbus = new EventbusClient();
