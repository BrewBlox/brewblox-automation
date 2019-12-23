import PouchDB from 'pouchdb';
import MemoryAdapter from 'pouchdb-adapter-memory';

import args from './args';
import logger from './logger';
import { AutomationProcess, AutomationRuntime, AutomationTask, DbStored } from './types';

PouchDB.plugin(MemoryAdapter);
logger.info(JSON.stringify(args));

export class Database<T extends DbStored> {
  private readonly remoteDb: PouchDB.Database<T> | null = null;
  private readonly localDb: PouchDB.Database<T>;

  public readonly name: string;
  public readonly local: boolean;

  public constructor(name: string) {
    this.name = name;
    this.local = args.local;
    this.localDb = new PouchDB<T>(name, { adapter: 'memory' });

    if (!this.local) {
      this.remoteDb = new PouchDB<T>(`http://${args.database}:5984/${name}`);
      logger.info('synching ' + name);
      logger.info(this.remoteDb.name);
      this.localDb
        .sync(this.remoteDb, { live: true, retry: true })
        .on('active', () => logger.info(`${name}: sync active`))
        .on('complete', () => logger.info(`${name}: sync ended`))
        .on('error', (err) => logger.info(`${name}: sync error ${err}`));
    }
  }

  public async clear() {
    const resp = await this.localDb.allDocs();
    const bulk = resp.rows
      .map(row => ({ _id: row.id, _rev: row.value.rev, _deleted: true })) as T[];
    this.localDb.bulkDocs(bulk);
  }

  public async fetchAll(): Promise<T[]> {
    const resp = await this.localDb.allDocs({ include_docs: true });
    return resp.rows.map(row => row.doc);
  }

  public async fetchById(id: string): Promise<T | null> {
    return await this.localDb.get(id);
  }

  public async create(item: T): Promise<T> {
    const resp = await this.localDb.put({ ...item, _rev: undefined });
    return { ...item, _rev: resp.rev };
  }

  public async save(item: T): Promise<T> {
    const resp = await this.localDb.put(item);
    return { ...item, _rev: resp.rev };
  }

  public async remove(item: T): Promise<T> {
    await this.localDb.remove({ _id: item._id, _rev: item._rev! });
    delete item._rev;
    return item;
  }
}

export const taskDb = new Database<AutomationTask>('brewblox-task');
export const processDb = new Database<AutomationProcess>('brewblox-process');
export const runtimeDb = new Database<AutomationRuntime>('brewblox-runtime');
