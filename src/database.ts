import axios, { AxiosInstance } from 'axios';

import args from './args';
import { extendById, filterById, findById } from './functional';
import { AutomationProcess, AutomationTask, StoreObject } from './types';

export interface AutomationDatabase<T extends StoreObject> {
  readonly local: boolean;
  clear(): Promise<void>;
  fetchAll(): Promise<T[]>;
  fetchById(id: string): Promise<T | null>;
  save(obj: T): Promise<T>;
  remove(obj: T): Promise<T>;
}

export class AutomationRedisDatabase
  <T extends StoreObject> implements AutomationDatabase<T> {
  private namespace: string;
  private http: AxiosInstance;
  private cache: T[] = [];
  private initialized = false;

  public readonly local: boolean;

  public constructor(moduleId: string) {
    this.namespace = `brewblox-automation:${moduleId}`;
    this.local = args.local;
    this.http = axios.create({ baseURL: 'http://history:5000/history/datastore' });
  }

  public async clear() {
    if (!this.local) {
      await this.http
        .post('/mdelete', {
          namespace: this.namespace,
          filter: '*',
        });
    }
    this.cache = [];
  }

  public async fetchAll(): Promise<T[]> {
    if (!this.local && !this.initialized) {
      this.cache = await this.http
        .post<{ values: T[] }>('/mget', {
          namespace: this.namespace,
          filter: '*',
        })
        .then(resp => resp.data.values);
      this.initialized = true;
    }
    return [...this.cache];
  }

  public async fetchById(id: string): Promise<T | null> {
    return findById(this.cache, id);
  }

  public async save(obj: T): Promise<T> {
    const value = {
      ...obj,
      namespace: this.namespace,
    };
    const updated = this.local
      ? value
      : await this.http
        .post<{ value: T }>('/set', { value })
        .then(resp => resp.data.value);
    this.cache = extendById(this.cache, updated);
    return updated;
  }

  public async remove(obj: T): Promise<T> {
    if (!this.local) {
      await this.http
        .post<{ value: T }>('/delete', {
          namespace: this.namespace,
          id: obj.id,
        });
    }
    this.cache = filterById(this.cache, obj);
    return obj;
  }
}

export const taskDb = new AutomationRedisDatabase<AutomationTask>('brewblox-task');
export const processDb = new AutomationRedisDatabase<AutomationProcess>('brewblox-process');
