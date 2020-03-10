import app from './app';
import args from './args';
import { database } from './database';
import { eventbus } from './eventbus';
import logger from './logger';
import { stateMachine } from './state-machine';

logger.info('==========Startup==========');

database.connect();
eventbus.connect();
stateMachine.start();

app.listen(args.port, () => {
  logger.info(`App is running at http://0.0.0.0:${args.port}`);
});

