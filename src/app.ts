import bodyParser from 'body-parser';
import compression from 'compression';
import errorHandler from 'errorhandler';
import express, { NextFunction, Request, Response } from 'express';

import * as processApi from './api/process';
import * as taskApi from './api/task-api';
import args from './args';

const prefix = '/' + args.name;

type Handler = (req: Request, res: Response, next: NextFunction) => Promise<any>

function wrap(handler: Handler): Handler {
  return async function (req: Request, res: Response, next: NextFunction) {
    try {
      return await handler(req, res, next);
    } catch (e) {
      return next(e);
    }
  };
}

const app = express();

app.set('port', args.port);
app.set('prefix', prefix);
app.use(compression());
app.use(bodyParser.json());
app.use(errorHandler());

app.get(prefix + '/tasks', wrap(taskApi.fetchAll));
app.put(prefix + '/tasks', wrap(taskApi.create));
app.post(prefix + '/test-task', wrap(taskApi.testCreate));

app.get(prefix + '/process', wrap(processApi.fetchAll));
app.get(prefix + '/process/:id', wrap(processApi.fetchById));
app.post(prefix + '/process', wrap(processApi.create));
app.put(prefix + '/process', wrap(processApi.save));
app.delete(prefix + '/process', wrap(processApi.remove));

export default app;
