import app from './app';
import logger from './logger';
import { stateMachine } from './state-machine';


logger.info('==========Startup==========');

/**
 * Start Express server.
 */
const server = app.listen(app.get('port'), () => {
  logger.info(`App is running at http://0.0.0.0:${app.get('port')}`);
  stateMachine.start();
});

export default server;
