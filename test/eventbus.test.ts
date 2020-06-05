import mqtt from 'mqtt';

import { eventbus, EventbusClient } from '../src/eventbus';
import { EventbusMessage } from '../src/types';


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
    publish: jest.fn(),
    subscribe: jest.fn(),
  };
  _mqtt.connect.mockReturnValue(mockClient);

  const send = (msg: EventbusMessage) =>
    callbacks.message('brewcast/state', Buffer.from(JSON.stringify(msg)));

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
    expect(client.getCached('test', 'gridnodes')).toMatchObject({ grid: true });

    // Invalid messages are discarded
    send({
      key: 'test',
      type: 'gridnodes',
    } as any);
    expect(client.getCached('test', 'gridnodes')).toMatchObject({ grid: true });

    send({
      key: 'test',
      type: 'graphnodes',
      ttl: '10m',
      data: { graph: true },
    });
    expect(client.getCached('test', 'gridnodes')).toMatchObject({ grid: true });
    expect(client.getCached('test', 'graphnodes')).toMatchObject({ graph: true });

    // Messages originating from automation are ignored
    send({
      key: 'automation',
      type: 'recursive',
      ttl: '10m',
      data: { recursive: 'this.recursive' },
    });
    expect(client.getCached('automation', 'recursive')).toBe(null);

    // getBlocks should default to empty list
    expect(client.getBlocks('sparkey')).toEqual([]);
  });
});
