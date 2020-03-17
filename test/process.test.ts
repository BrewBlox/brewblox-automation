import request from 'supertest';
import { v4 as uid } from 'uuid';

import app from '../src/app';
import { database, processDb } from '../src/database';
import { AutomationProcess } from '../src/types';

describe('/automation/process/', () => {
  const procId = uid();
  const stepId = uid();
  const proc: AutomationProcess = {
    id: procId,
    title: 'Test Process',
    steps: [{
      id: stepId,
      title: 'Step One',
      preconditions: [{
        id: uid(),
        title: 'Precondition one',
        enabled: true,
        impl: {
          type: 'TaskStatus',
          ref: 'precondition-task',
          status: 'Finished',
        },
      }],
      actions: [{
        id: uid(),
        title: 'Action one',
        enabled: true,
        impl: {
          type: 'TaskCreate',
          ref: 'tasky',
          title: 'Created task',
          message: 'Beep boop I am robot',
        },
      }],
      transitions: [{
        id: uid(),
        next: true,
        enabled: true,
        conditions: [
          {
            id: uid(),
            title: 'Wait until',
            enabled: false,
            impl: {
              type: 'TimeAbsolute',
              time: new Date().getTime(),
            },
          },
          {
            id: uid(),
            title: 'Wait for',
            enabled: true,
            impl: {
              type: 'TimeElapsed',
              start: 'Step',
              duration: 100,
            },
          },
        ],
      }],
    }],
    results: [{
      id: uid(),
      stepId: stepId,
      date: new Date().getTime(),
      stepStatus: 'Created',
      processStatus: 'Active',
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

    expect(res.body).toMatchObject(proc);
    expect(res.status).toEqual(201);

    res = await server
      .get('/automation/process/all');

    expect(res.status).toEqual(200);
    expect(res.body).toMatchObject([proc]);

    res = await server
      .get(`/automation/process/read/${proc.id}`);

    expect(res.status).toEqual(200);
    expect(res.body).toMatchObject(proc);
  });
});
