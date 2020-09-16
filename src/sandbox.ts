import { Mutex } from 'async-mutex';
import { ChildProcess, fork } from 'child_process';
import detectTSNode from 'detect-ts-node';
import shortid from 'shortid';

import { eventbus } from './eventbus';
import { sanitize } from './functional';
import logger from './logger';
import type { SandboxInput, SandboxOutput, SandboxResult } from './types';

const SANDBOX_TIMEOUT = 10 * 1000;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class AutomationSandbox {
  private mutex: Mutex = new Mutex();
  private proc: ChildProcess | null = null;

  private ensureProcess(): ChildProcess {
    if (this.proc && this.proc.connected) {
      return this.proc;
    }
    const entrypoint = detectTSNode
      ? 'src/sandbox-main.ts'
      : 'dist/sandbox-main.js';
    logger.info(`Creating sandbox process for '${entrypoint}'`);
    this.proc = fork(entrypoint);
    return this.proc;
  }

  public async run(script: string): Promise<SandboxResult> {
    const release = await this.mutex.acquire();
    try {
      const id = shortid.generate();
      const proc = this.ensureProcess();
      const messages: any[] = [];
      const inputData: SandboxInput = {
        id,
        script,
        blocks: sanitize(eventbus.getBlocks()),
        events: sanitize(eventbus.getAllCached()),
      };

      // Handle normal flow
      // Resolve with received result / error
      const resultPromise = new Promise<SandboxResult>((resolve) => {
        proc.removeAllListeners('message');
        proc.on('message', (data: SandboxOutput) => {
          if (data.id !== id) { return; }
          const { result, error, message } = data;
          if (message !== undefined) {
            messages.push(message);
          }
          if (error !== undefined) {
            resolve({
              date: new Date().getTime(),
              returnValue: null,
              error,
              messages,
            });
          }
          if (result !== undefined) {
            resolve({
              date: new Date().getTime(),
              returnValue: result,
              messages,
            });
          }
        });
      });

      // Handle timeout
      // Kill the process, and reject with error message
      const timeoutPromise = new Promise<never>((resolve, reject) =>
        sleep(SANDBOX_TIMEOUT)
          .then(() => reject(new Error('Timeout error'))));

      proc.send(inputData);
      return await Promise.race([
        resultPromise,
        timeoutPromise,
      ])
        .catch((e) => {
          logger.error('Sandbox error: ' + e.message);
          proc.kill();
          return {
            date: new Date().getTime(),
            messages,
            returnValue: null,
            error: {
              message: e.message,
              line: 0,
            },
          };
        });
    }
    finally {
      release();
    }
  }
}

export default new AutomationSandbox();
