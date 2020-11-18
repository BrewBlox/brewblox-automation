import mqtt from 'mqtt';

import { eventbus, EventbusClient } from '../src/eventbus';
import { StateEvent } from '../src/types';


jest.mock('mqtt');
const _mqtt: any = mqtt;

describe('Eventbus object', () => {

  it('should be an EventbusClient', () => {
    expect(eventbus instanceof EventbusClient).toBe(true);
  });
});

describe('Eventbus message parsing', () => {
  const callbacks: { [key: string]: Function } = {};
  const mockClient = {
    on: jest.fn((n, cb) => callbacks[n] = cb),
    publishActive: jest.fn(),
    subscribe: jest.fn(),
  };
  _mqtt.connect.mockReturnValue(mockClient);

  const send = (msg: StateEvent, topic = 'brewcast/state') =>
    callbacks.message(topic, Buffer.from(JSON.stringify(msg)));

  it('should handle messages', async () => {
    const client = new EventbusClient();
    await client.connect();
    expect(mockClient.on.mock.calls.length).toBe(3);
    expect(typeof callbacks.message).toBe('function');

    expect(mockClient.subscribe.mock.calls.length).toBe(0);
    callbacks.connect();
    expect(mockClient.subscribe.mock.calls.length).toBe(1);

    send({
      key: 'test',
      type: 'gridnodes',
      ttl: '10m',
      data: { grid: true },
    });
    expect(client.getCached('gridnodes', 'test')).toMatchObject({ data: { grid: true } });

    // Invalid messages are discarded
    send({
      key: 'test',
      type: 'gridnodes',
    } as any);
    expect(client.getCached('gridnodes', 'test')).toMatchObject({ data: { grid: true } });

    // Messages originating from automation are ignored
    send({
      key: 'automation',
      type: 'recursive',
      ttl: '10m',
      data: { recursive: 'this.recursive' },
    }, 'brewcast/state/automation');
    expect(client.getCached('recursive', 'automation')).toBeNull();

    // getBlocks should default to empty list
    expect(client.getBlocks('sparkey')).toEqual([]);
  });
});
