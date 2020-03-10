import amqplib, { Channel, Message } from 'amqplib';
import parseDuration from 'parse-duration';

import logger from './logger';
import { CachedMessage, EventbusMessage } from './types';
import { lastErrors, validateMessage } from './validation';

const statusExchange = 'brewcast.state';

export class EventbusClient {
  private lastOk = true;
  private channel: Channel | null = null;
  private cache: Record<string, CachedMessage> = {};

  public constructor() {
    setInterval(() => this.cleanCache(), 10000);
  }

  private cleanCache(): void {
    const now = new Date().getTime();
    Object.values(this.cache)
      .filter(msg => msg.expires < now)
      .map(msg => msg.key)
      .forEach(k => {
        logger.info(`Removing expired message from '${k}'`);
        delete this.cache[k];
      });
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
    const message: EventbusMessage = JSON.parse(msg.content.toString());
    if (!validateMessage(message)) {
      logger.warn(`Discarded eventbus message from '${message.key}'`);
      logger.warn(lastErrors());
      return;
    }
    const now = new Date().getTime();
    const duration = parseDuration(message.duration);
    this.cache[message.key] = {
      ...message,
      expires: now + duration,
    };
  }

}

export const eventbus = new EventbusClient();
