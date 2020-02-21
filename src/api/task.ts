import { NextFunction, Request, Response, Router } from 'express';

import { taskDb } from '../database';
import { validateTask } from '../validation';
import { wrap } from './utils';

const validate = (req: Request, res: Response, next: NextFunction) => {
  validateTask(req.body)
    ? next()
    : res.sendStatus(422);
};

const fetchAll = async (req: Request, res: Response) => {
  res
    .json(await taskDb.fetchAll());
};

const fetchById = async (req: Request, res: Response) => {
  res
    .json(await taskDb.fetchById(req.params.id));
};

const create = async (req: Request, res: Response) => {
  res
    .status(201)
    .json(await taskDb.create(req.body));
};

const save = async (req: Request, res: Response) => {
  res
    .json(await taskDb.save(req.body));
};

const remove = async (req: Request, res: Response) => {
  res
    .json(await taskDb.remove(req.body));
};

const testCreate = async (req: Request, res: Response) => {
  res
    .status(201)
    .json(await taskDb.create({
      id: 'test-task',
      ref: 'testing',
      title: 'Test Task',
      source: {
        runtimeId: 'test rt',
        stepId: 'test step',
      },
      message: 'hello this is task',
      status: 'Created',
    }));
};

const router = Router({ mergeParams: true });
router.get('/', wrap(fetchAll));
router.get('/:id', wrap(fetchById));
router.post('/', validate, wrap(create));
router.put('/', validate, wrap(save));
router.delete('/', validate, wrap(remove));

router.post('/test', wrap(testCreate));

export default router;
