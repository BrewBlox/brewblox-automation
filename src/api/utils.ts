import { NextFunction, Request, Response } from 'express';

type Handler = (req: Request, res: Response, next: NextFunction) => Promise<any>

export function wrap(handler: Handler): Handler {
  return async function (req: Request, res: Response, next: NextFunction) {
    try {
      return await handler(req, res, next);
    } catch (e) {
      return next(e);
    }
  };
}
