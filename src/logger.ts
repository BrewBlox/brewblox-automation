import { createLogger, format, transports } from 'winston';

import args from './args';

export default createLogger({
  level: args.debug ? 'debug' : 'info',
  format: format.combine(
    format.splat(),
    format.json(),
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.printf(info => `${info.timestamp} [${info.level}] ${info.message}`),
  ),
  transports: [
    new transports.Console(),
  ],
});
