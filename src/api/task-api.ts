import { Request, Response } from 'express';

import { taskDb } from '../database';


export const fetchAll = async (req: Request, res: Response) => {
  res
    .json(await taskDb.fetchAll());
};

export const create = async (req: Request, res: Response) => {
  res
    .status(201)
    .json(await taskDb.create(req.body));
};

export const save = async (req: Request, res: Response) => {
  res
    .json(await taskDb.save(req.body));
};

export const testCreate = async (req: Request, res: Response) => {
  res
    .status(201)
    .json(await taskDb.create({
      _id: 'test-task',
      ref: 'testing',
      title: 'Test Task',
      source: 'jesttasktest',
      message: 'hello this is task',
      status: 'Created',
    }));
};
