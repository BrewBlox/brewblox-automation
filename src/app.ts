import bodyParser from 'body-parser';
import compression from 'compression';
import errorHandler from 'errorhandler';
import express, { NextFunction, Request, Response } from 'express';

import * as taskApi from './api/task-api';

const prefix = '/' + (process.env.NAME ?? 'automation');


type Handler = (req: Request, res: Response, next: NextFunction) => Promise<any>

function wrap(handler: Handler): Handler {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      return await handler(req, res, next);
    } catch (e) {
      return next(e);
    }
  };
}

const app = express();

app.set('port', process.env.PORT || 5000);
app.set('prefix', prefix);
app.use(compression());
app.use(bodyParser.json());

if (process.env.NODE_ENV !== 'production') {
  app.use(errorHandler());
}

app.get(prefix + '/tasks', wrap(taskApi.fetchAll));
app.put(prefix + '/tasks', wrap(taskApi.create));

export default app;
