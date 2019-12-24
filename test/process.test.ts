import request from 'supertest';

import app from '../src/app';
import { client, processDb } from '../src/database';
import { AutomationProcess } from '../src/types';

describe('/automation/process/', () => {
  const proc: AutomationProcess = {
    id: 'test-process',
    title: 'Test Process',
    steps: [{
      id: 'step-one',
      title: 'Step One',
      enabled: true,
      actions: [],
      conditions: [],
      notes: [],
    }],
  };

  beforeEach(done => processDb.clear().then(() => done()));

  it('should read empty database', async () => {
    const res = await request(app)
      .get('/automation/process');
    expect(res.status).toEqual(200);
    expect(res.body).toEqual([]);
  });

  it('should be a local database', () => {
    expect(client.local).toBe(true);
  });

  it('should create process', async () => {
    let res = await request(app)
      .post('/automation/process')
      .send(proc);

    expect(res.status).toEqual(201);
    expect(res.body).toMatchObject(proc);

    res = await request(app)
      .get('/automation/process');

    expect(res.status).toEqual(200);
    expect(res.body).toMatchObject([proc]);

    res = await request(app)
      .get('/automation/process/test-process');

    expect(res.status).toEqual(200);
    expect(res.body).toMatchObject(proc);
  });
});
