import PouchDB from 'pouchdb';
import MemoryAdapter from 'pouchdb-adapter-memory';

import args from './args';
import logger from './logger';
import { AutomationProcess, AutomationRuntime, AutomationTask, StoreObject } from './types';

type IdMeta = PouchDB.Core.IdMeta;
type RevisionIdMeta = PouchDB.Core.RevisionIdMeta;

PouchDB.plugin(MemoryAdapter);

export const name = 'brewblox-automation';

export class DatabaseClient {
  private readonly localDb: PouchDB.Database;
  private remoteDb: PouchDB.Database | null = null;

  public readonly local: boolean;

  public constructor() {
    this.local = args.local;
    this.localDb = new PouchDB(name, { adapter: 'memory' });
  }

  public connect(): void {
    if (!this.local) {
      this.remoteDb = new PouchDB(`http://${args.database}:5984/${name}`);
      logger.info('Starting database sync: ' + this.remoteDb.name);
      this.localDb
        .sync(this.remoteDb, { live: true, retry: true })
        .on('active', () => logger.info(`${name}: sync active`))
        .on('complete', () => logger.info(`${name}: sync ended`))
        .on('error', (err) => logger.info(`${name}: sync error ${err}`));
      this.checkRemote();
    }
  }

  private async checkRemote() {
    try {
      await this.remoteDb.info();
    } catch (e) {
      logger.warn(`Failed to check remote DB: ${e.message}`);
    }
  }

  public get db(): PouchDB.Database {
    return this.localDb;
  }
}

export class AutomationDatabase<T extends StoreObject> {
  private readonly client: DatabaseClient;
  public readonly moduleId: string;

  public constructor(client: DatabaseClient, moduleId: string) {
    this.client = client;
    this.moduleId = moduleId;
  }

  private get db(): PouchDB.Database {
    return this.client.db;
  }

  private cleanId(docId: string): string {
    return docId.substring(`${this.moduleId}__`.length);
  }

  private docId(id: string): string {
    return `${this.moduleId}__${id}`;
  }

  private checkInModule({ id }: { id: string }): boolean {
    return id.startsWith(`${this.moduleId}__`);
  }

  private asStoreObject(doc: IdMeta): T {
    const { _id, ...obj } = doc;
    return { ...obj, id: this.cleanId(_id) } as T;
  }

  private asDocument(obj: T): IdMeta & RevisionIdMeta {
    const { id, _rev, ...doc } = obj;
    return { ...doc, _rev, _id: this.docId(id) };
  }

  private asNewDocument(obj: T): IdMeta {
    const { id, _rev, ...doc } = obj;
    void _rev;
    return { ...doc, _id: this.docId(id) };
  }

  public async clear() {
    const resp = await this.db.allDocs();
    const bulk = resp.rows
      .filter(row => this.checkInModule(row))
      .map(row => ({ _id: row.id, _rev: row.value.rev, _deleted: true }));
    this.db.bulkDocs(bulk);
  }

  public async fetchAll(): Promise<T[]> {
    const resp = await this.db.allDocs({ include_docs: true });
    return resp.rows
      .filter(row => this.checkInModule(row))
      .map(row => this.asStoreObject(row.doc));
  }

  public async fetchById(id: string): Promise<T | null> {
    return await this.db
      .get(this.docId(id))
      .then(doc => this.asStoreObject(doc));
  }

  public async create(obj: T): Promise<T> {
    const resp = await this.db.put(this.asNewDocument(obj));
    return { ...obj, _rev: resp.rev };
  }

  public async save(obj: T): Promise<T> {
    const resp = await this.db.put(this.asDocument(obj));
    return { ...obj, _rev: resp.rev };
  }

  public async remove(obj: T): Promise<T> {
    await this.db.remove(this.asDocument(obj));
    return { ...obj, _rev: undefined };
  }
}

export const database = new DatabaseClient();
export const taskDb = new AutomationDatabase<AutomationTask>(database, 'brewblox-task');
export const processDb = new AutomationDatabase<AutomationProcess>(database, 'brewblox-process');
export const runtimeDb = new AutomationDatabase<AutomationRuntime>(database, 'brewblox-runtime');
