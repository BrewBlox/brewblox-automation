import { Request, Response } from 'express';

import { runtimeDb } from '../database';

export const fetchAll = async (req: Request, res: Response) => {
  res
    .json(await runtimeDb.fetchAll());
};

export const fetchById = async (req: Request, res: Response) => {
  res
    .json(await runtimeDb.fetchById(req.params.id));
};

export const create = async (req: Request, res: Response) => {
  res
    .status(201)
    .json(await runtimeDb.create(req.body));
};

export const save = async (req: Request, res: Response) => {
  res
    .json(await runtimeDb.save(req.body));
};

export const remove = async (req: Request, res: Response) => {
  res
    .json(await runtimeDb.remove(req.body));
};
