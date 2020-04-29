import request from 'supertest';
import { v4 as uid } from 'uuid';

import app from '../src/app';
import { database, taskDb } from '../src/database';
import { AutomationTask } from '../src/types';

describe('/automation/task', () => {
  const task: AutomationTask = {
    id: uid(),
    ref: 'testing',
    title: 'Test Task',
    message: 'hello this is task',
    status: 'Created',
    processId: uid(),
    stepId: uid(),
    createdBy: 'Action',
  };
  const server = request(app.callback());

  beforeEach(done => taskDb.clear().then(() => done()));

  it('should be a local database', () => {
    expect(database.local).toBe(true);
  });

  it('should read empty database', async () => {
    const res = await server
      .get('/automation/task/all');
    expect(res.status).toEqual(200);
    expect(res.body).toEqual([]);
  });

  it('should create task', async () => {
    let res = await server
      .post('/automation/task/create')
      .send(task);

    expect(res.status).toEqual(201);
    expect(res.body).toMatchObject(task);

    res = await server
      .get('/automation/task/all');

    expect(res.status).toEqual(200);
    expect(res.body).toMatchObject([task]);
  });

  it('should fail to create multiple tasks', async () => {
    let res = await server
      .post('/automation/task/create')
      .send(task);

    expect(res.status).toEqual(201);

    res = await server
      .post('/automation/task/create')
      .send(task);

    expect(res.status).toBeGreaterThan(400);
  });

  it('should remove tasks', async () => {
    let res = await server
      .post('/automation/task/create')
      .send(task);

    const created: AutomationTask = res.body;
    expect(created).toMatchObject(task);
    expect(created._rev).toBeDefined();

    res = await server
      .get(`/automation/task/read/${task.id}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject(task);

    const x = await server
      .delete(`/automation/task/delete/${created.id}`)
      .send(created);

    expect(x.status).toBe(200);

    expect(res.status).toBe(200);

    res = await server
      .get(`/automation/task/read/${task.id}`);

    expect(res.status).toBe(404);
  });

  it('should validate arguments', async () => {
    let res = await server
      .post('/automation/task/create')
      .send({ id: 'flappy', content: 'fluffy bunnies' });

    expect(res.status).toEqual(422);

    res = await server
      .post('/automation/task/create')
      .send(task);

    const created = res.body;
    const extended = { ...created, extended: true };
    const { title, ...shrunken } = created;
    void title;

    res = await server
      .post('/automation/task/update')
      .send(shrunken);

    expect(res.status).toEqual(422);

    res = await server
      .post('/automation/task/update')
      .send(extended);

    expect(res.status).toEqual(200);

    res = await server
      .get(`/automation/task/read/${task.id}`);

    expect(res.status).toEqual(200);
    expect(res.body).toMatchObject({
      ...extended,
      _rev: expect.stringMatching(/\d\-[a-z0-9]+/),
    });
  });
});
