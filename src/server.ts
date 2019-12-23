import app from './app';
import logger from './logger';

/**
 * Start Express server.
 */
const server = app.listen(app.get('port'), () => {
  logger.info(`App is running at http://0.0.0.0:${app.get('port')}${app.get('prefix')}`);
});

export default server;
