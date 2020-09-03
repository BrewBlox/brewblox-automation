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

export class AutomationLocalDatabase
  <T extends StoreObject> implements AutomationDatabase<T> {
  public readonly local = true;
  private namespace: string;
  private objects: T[] = [];

  public constructor(moduleId: string) {
    this.namespace = `brewblox-automation:${moduleId}`;
  }

  public async clear() {
    this.objects = [];
  }

  public async fetchAll(): Promise<T[]> {
    return [...this.objects];
  }

  public async fetchById(id: string): Promise<T | null> {
    return findById(this.objects, id);
  }

  public async save(obj: T): Promise<T> {
    const copy = { ...obj, namespace: this.namespace };
    this.objects = extendById(this.objects, copy);
    return copy;
  }

  public async remove(obj: T): Promise<T> {
    this.objects = filterById(this.objects, obj);
    return obj;
  }
}

export class AutomationRedisDatabase
  <T extends StoreObject> implements AutomationDatabase<T> {
  public readonly local = false;
  private namespace: string;
  private http: AxiosInstance;

  public constructor(moduleId: string) {
    this.namespace = `brewblox-automation:${moduleId}`;
    this.http = axios.create({ baseURL: 'http://history:5000/history/datastore' });
  }

  public async clear() {
    await this.http
      .post('/mdelete', {
        namespace: this.namespace,
        filter: '*',
      });
  }

  public async fetchAll(): Promise<T[]> {
    return await this.http
      .post<{ values: T[] }>('/mget', {
        namespace: this.namespace,
        filter: '*',
      })
      .then(resp => resp.data.values);
  }

  public async fetchById(id: string): Promise<T | null> {
    return await this.http
      .post<{ value: T | null }>('/get', {
        namespace: this.namespace,
        id,
      })
      .then(resp => resp.data.value);
  }

  public async save(obj: T): Promise<T> {
    return await this.http
      .post<{ value: T }>('/set', {
        value: {
          ...obj,
          namespace: this.namespace,
        },
      })
      .then(resp => resp.data.value);
  }

  public async remove(obj: T): Promise<T> {
    await this.http
      .post<{ value: T }>('/delete', {
        namespace: this.namespace,
        id: obj.id,
      });
    return obj;
  }
}

const factory = <T extends StoreObject>(name: string): AutomationDatabase<T> =>
  args.local
    ? new AutomationLocalDatabase<T>(name)
    : new AutomationRedisDatabase<T>(name);

export const taskDb = factory<AutomationTask>('brewblox-task');
export const processDb = factory<AutomationProcess>('brewblox-process');
