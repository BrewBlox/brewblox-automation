import { AutomationTask } from '../types';
import PouchDB from './pouchdb';


const remoteAddress = `http://${process.env.DB_HOST ?? 'datastore'}/brewblox-tasks`;
const db = new PouchDB<AutomationTask>('brewblox-tasks', { adapter: 'memory' });

if (process.env.NODE_ENV !== 'test') {
  const remoteDb = new PouchDB<AutomationTask>(remoteAddress);
  db.sync(remoteDb, { live: true, retry: true });
}

export const clear = async () => {
  const resp = await db.allDocs();
  await Promise.all(resp.rows.map(row => db.remove(row.id, row.value.rev)));
};

export const fetchAll = async (): Promise<AutomationTask[]> => {
  const resp = await db.allDocs({ include_docs: true });
  return resp.rows
    .map(row => row.doc);
};

export const create = async (task: AutomationTask): Promise<AutomationTask> => {
  const resp = await db.put({ ...task, _rev: undefined });
  return { ...task, _rev: resp.rev };
};
