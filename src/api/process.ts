import { Request, Response } from 'express';

import { processDb } from '../database';

export const fetchAll = async (req: Request, res: Response) => {
  res
    .json(await processDb.fetchAll());
};

export const fetchById = async (req: Request, res: Response) => {
  res
    .json(await processDb.fetchById(req.params.id));
};

export const create = async (req: Request, res: Response) => {
  res
    .status(201)
    .json(await processDb.create(req.body));
};

export const save = async (req: Request, res: Response) => {
  res
    .json(await processDb.save(req.body));
};

export const remove = async (req: Request, res: Response) => {
  res
    .json(await processDb.remove(req.body));
};
