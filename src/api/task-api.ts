import { NextFunction, Request, Response } from 'express';

import * as db from '../database/task-db';


export const fetchAll = async (req: Request, res: Response, next: NextFunction) => {
  res
    .json(await db.fetchAll());
};

export const create = async (req: Request, res: Response, next: NextFunction) => {
  res
    .status(201)
    .json(await db.create(req.body));
};
