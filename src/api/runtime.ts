import { NextFunction, Request, Response, Router } from 'express';

import { runtimeDb } from '../database';
import { validateRuntime } from '../validation';
import { wrap } from './utils';

const validate = (req: Request, res: Response, next: NextFunction) => {
  validateRuntime(req.body)
    ? next()
    : res.sendStatus(422);
};

const fetchAll = async (req: Request, res: Response) => {
  res
    .json(await runtimeDb.fetchAll());
};

const fetchById = async (req: Request, res: Response) => {
  res
    .json(await runtimeDb.fetchById(req.params.id));
};

const create = async (req: Request, res: Response) => {
  res
    .status(201)
    .json(await runtimeDb.create(req.body));
};

const save = async (req: Request, res: Response) => {
  res
    .json(await runtimeDb.save(req.body));
};

const remove = async (req: Request, res: Response) => {
  res
    .json(await runtimeDb.remove(req.body));
};

const router = Router({ mergeParams: true });
router.get('/', wrap(fetchAll));
router.get('/:id', wrap(fetchById));
router.post('/', validate, wrap(create));
router.put('/', validate, wrap(save));
router.delete('/', wrap(remove));

export default router;
