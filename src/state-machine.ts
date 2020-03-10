import logger from './logger';

export class StateMachine {

  public start(): void {

    logger.info('Started state machine');
  }
}

export const stateMachine = new StateMachine();
