import axios from 'axios';

import app from './app';
import args from './args';
import { eventbus } from './eventbus';
import { addInterceptors } from './functional';
import logger from './logger';
import { processor } from './processor';

logger.info('==========Startup==========');

eventbus.connect();
processor.start();

addInterceptors(axios);

app.listen(args.port, () => {
  logger.info(`App is running at http://0.0.0.0:${args.port}/${args.name}`);
});
