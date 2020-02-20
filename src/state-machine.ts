import { database } from './database';
import { eventbus } from './eventbus';
import logger from './logger';

export class StateMachine {

  public start(): void {
    database.connect();
    eventbus.connect();
    logger.info('Started state machine');
  }
}

export const stateMachine = new StateMachine();
