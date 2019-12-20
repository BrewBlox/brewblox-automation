import PouchDB from 'pouchdb';
import MemoryAdapter from 'pouchdb-adapter-memory';

PouchDB.plugin(MemoryAdapter);

export default PouchDB;
