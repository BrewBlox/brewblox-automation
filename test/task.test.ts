import request from 'supertest';

import app from '../src/app';
import { database, taskDb } from '../src/database';
import { AutomationTask } from '../src/types';

describe('/automation/task', () => {
  const task: AutomationTask = {
    id: 'test-task',
    ref: 'testing',
    title: 'Test Task',
    source: 'jesttasktest',
    message: 'hello this is task',
    status: 'Created',
  };

  beforeEach(done => taskDb.clear().then(() => done()));

  it('should be a local database', () => {
    expect(database.local).toBe(true);
  });

  it('should read empty database', async () => {
    const res = await request(app)
      .get('/automation/task');
    expect(res.status).toEqual(200);
    expect(res.body).toEqual([]);
  });

  it('should create task', async () => {
    let res = await request(app)
      .post('/automation/task')
      .send(task);

    expect(res.status).toEqual(201);
    expect(res.body).toMatchObject(task);

    res = await request(app)
      .get('/automation/task');

    expect(res.status).toEqual(200);
    expect(res.body).toMatchObject([task]);
  });

  it('should fail to create multiple tasks', async () => {
    let res = await request(app)
      .post('/automation/task')
      .send(task);

    expect(res.status).toEqual(201);

    res = await request(app)
      .post('/automation/task')
      .send(task);

    expect(res.status).toBeGreaterThan(400);
  });

  it('should remove tasks', async () => {
    let res = await request(app)
      .post('/automation/task')
      .send(task);

    const created = res.body;

    res = await request(app)
      .get(`/automation/task/${task.id}`);

    expect(res.status).toBe(200);

    res = await request(app)
      .delete('/automation/task')
      .send(created);

    expect(res.status).toBe(200);

    res = await request(app)
      .get(`/automation/task/${task.id}`);

    expect(res.status).toBe(404);
  });

  it('should validate arguments', async () => {
    let res = await request(app)
      .post('/automation/task')
      .send({ id: 'flappy', content: 'fluffy bunnies' });

    expect(res.status).toEqual(422);

    res = await request(app)
      .post('/automation/task')
      .send(task);

    const created = res.body;
    const extended = { ...created, extended: true };
    const { title, ...shrunken } = created;
    void title;

    res = await request(app)
      .put('/automation/task')
      .send(shrunken);

    expect(res.status).toEqual(422);

    res = await request(app)
      .put('/automation/task')
      .send(extended);

    expect(res.status).toEqual(200);

    res = await request(app)
      .get(`/automation/task/${task.id}`);

    expect(res.body).toMatchObject({
      ...extended,
      _rev: expect.stringMatching(/\d\-[a-z0-9]+/),
    });
  });
});
