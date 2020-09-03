import request from 'supertest';
import { v4 as uid } from 'uuid';

import app from '../src/app';
import { processDb } from '../src/database';
import { AutomationProcess, AutomationStepJump, AutomationTemplate } from '../src/types';

describe('/automation/process/', () => {
  const template: AutomationTemplate = {
    id: uid(),
    title: 'Test Process',
    steps: [{
      id: uid(),
      title: 'Step One',
      preconditions: [{
        id: uid(),
        title: 'Precondition one',
        enabled: true,
        impl: {
          type: 'TaskStatus',
          ref: 'precondition-task',
          status: 'Finished',
          resetStatus: null,
        },
      }],
      actions: [{
        id: uid(),
        title: 'Action one',
        enabled: true,
        impl: {
          type: 'TaskEdit',
          ref: 'tasky',
          title: 'Created task',
          message: 'Beep boop I am robot',
          status: null,
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
    expect(processDb.local).toBe(true);
  });

  it('should initialize a process', async () => {
    let res = await server
      .post('/automation/process/init')
      .send(template);

    const proc: AutomationProcess = res.body;
    expect(proc.id !== template.id).toBeTruthy();
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

  it('should validate transition targets', async () => {
    const copy = JSON.parse(JSON.stringify(template));
    copy.steps[0].transitions[0].next = uid();

    const res = await server
      .post('/automation/process/init')
      .send(copy);

    expect(res.status).toEqual(422);
    expect(res.text).toMatch('Transition target');
  });

  it('should remove a process', async () => {
    let res = await server
      .post('/automation/process/init')
      .send(template);

    expect(res.status).toBe(201);
    const proc: AutomationProcess = res.body;

    res = await server
      .delete(`/automation/process/delete/${proc.id}`);
    expect(res.status).toBe(200);

    res = await server
      .delete(`/automation/process/delete/${proc.id}`);
    expect(res.status).toBe(200);
  });

  it('should jump to a process step', async () => {
    let res = await server
      .post('/automation/process/init')
      .send(template);

    expect(res.status).toBe(201);
    const proc: AutomationProcess = res.body;
    const jump: AutomationStepJump = {
      processId: proc.id,
      stepId: proc.steps[0].id,
    };

    res = await server
      .post('/automation/process/jump')
      .send(jump);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject(proc);
  });
});
