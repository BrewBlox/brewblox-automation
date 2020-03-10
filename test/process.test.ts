import request from 'supertest';

import app from '../src/app';
import { database, processDb } from '../src/database';
import { AutomationProcess } from '../src/types';

describe('/automation/process/', () => {
  const proc: AutomationProcess = {
    id: 'test-process',
    title: 'Test Process',
    start: new Date().getTime(),
    end: null,
    status: 'Created',
    steps: [{
      id: 'step-one',
      title: 'Step One',
      enabled: true,
      actions: [],
      transitions: [],
    }],
    results: [{
      id: 'result-one',
      title: 'Step One',
      stepId: 'step-one',
      start: null,
      end: null,
      status: 'Done',
    }],
  };
  const server = request(app.callback());

  beforeEach(done => processDb.clear().then(() => done()));

  it('should read empty database', async () => {
    const res = await server
      .get('/automation/process/all');
    expect(res.status).toEqual(200);
    expect(res.body).toEqual([]);
  });

  it('should be a local database', () => {
    expect(database.local).toBe(true);
  });

  it('should create process', async () => {
    let res = await server
      .post('/automation/process/create')
      .send(proc);

    expect(res.status).toEqual(201);
    expect(res.body).toMatchObject(proc);

    res = await server
      .get('/automation/process/all');

    expect(res.status).toEqual(200);
    expect(res.body).toMatchObject([proc]);

    res = await server
      .get('/automation/process/read/test-process');

    expect(res.status).toEqual(200);
    expect(res.body).toMatchObject(proc);
  });
});
