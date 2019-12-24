import { NextFunction, Request, Response, Router } from 'express';

import { processDb } from '../database';
import { validateProcess } from '../validation';
import { wrap } from './utils';

const validate = (req: Request, res: Response, next: NextFunction) => {
  validateProcess(req.body)
    ? next()
    : res.sendStatus(422);
};

const fetchAll = async (req: Request, res: Response) => {
  res
    .json(await processDb.fetchAll());
};

const fetchById = async (req: Request, res: Response) => {
  res
    .json(await processDb.fetchById(req.params.id));
};

const create = async (req: Request, res: Response) => {
  res
    .status(201)
    .json(await processDb.create(req.body));
};

const save = async (req: Request, res: Response) => {
  res
    .json(await processDb.save(req.body));
};

const remove = async (req: Request, res: Response) => {
  res
    .json(await processDb.remove(req.body));
};

const router = Router({ mergeParams: true });
router.get('/', wrap(fetchAll));
router.get('/:id', wrap(fetchById));
router.post('/', validate, wrap(create));
router.put('/', validate, wrap(save));
router.delete('/', wrap(remove));

export default router;
