import compression from 'compression';
import express, { Router } from 'express';

import processApi from './api/process';
import runtimeApi from './api/runtime';
import taskApi from './api/task';
import args from './args';

const app = express();

const router = Router({ mergeParams: true });
router.use('/task', taskApi);
router.use('/process', processApi);
router.use('/runtime', runtimeApi);

app.set('port', args.port);
app.use(compression());
app.use(express.json());
app.use(`/${args.name}`, router);

export default app;
