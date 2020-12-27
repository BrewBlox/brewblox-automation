import mqtt from 'mqtt';

import { eventbus, EventbusClient } from '../src/eventbus';


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

  const send = (topic: string, msg: any) =>
    callbacks.message(topic, Buffer.from(JSON.stringify(msg)));

  it('should handle messages', async () => {
    const client = new EventbusClient();
    await client.connect();
    expect(mockClient.on.mock.calls.length).toBe(3);
    expect(typeof callbacks.message).toBe('function');

    expect(mockClient.subscribe.mock.calls.length).toBe(0);
    callbacks.connect();
    expect(mockClient.subscribe.mock.calls.length).toBe(1);

    send('brewcast/state/service',
      {
        key: 'test',
        type: 'gridnodes',
        ttl: '10m',
        data: { grid: true },
      });
    expect(client.getCached('brewcast/state/service')).toMatchObject({
      topic: 'brewcast/state/service',
      payload: { data: { grid: true } },
    });

    // Messages originating from automation are ignored
    send('brewcast/state/automation',
      {
        key: 'automation',
        type: 'recursive',
        ttl: '10m',
        data: { recursive: 'this.recursive' },
      });
    expect(client.getCached('brewcast/state/automation')).toBeNull();

    // getBlocks should default to empty list
    expect(client.getBlocks('sparkey')).toEqual([]);
  });
});
