import { AxiosInstance } from 'axios';
import { get, isArray, isBoolean, isNumber, isPlainObject, isString } from 'lodash';

import type { HasId } from './types';


export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Overloads for spliceById
// if insert is false, the stub { id } is sufficient to remove the existing object
export function spliceById<T extends HasId>(arr: T[], obj: T): T[];
export function spliceById<T extends HasId>(arr: T[], obj: T, insert: true): T[];
export function spliceById<T extends HasId>(arr: T[], obj: HasId, insert: false): T[];

/**
 * Modifies input array by either replacing or removing a member.
 * Returns the modified array.
 * If no members match `obj`, `arr` is not modified.
 *
 * @param arr object collection
 * @param obj compared object
 * @param insert true to replace the object, false to remove
 */
export function spliceById<T extends HasId>(arr: T[], obj: T, insert = true): T[] {
  const idx = arr.findIndex(v => v.id === obj.id);
  if (idx !== -1) {
    insert
      ? arr.splice(idx, 1, obj)
      : arr.splice(idx, 1);
  }
  return arr;
}

/**
 * Returns a new array consisting of all members of input array
 * minus those matching `obj`.
 * Does not modify input array.
 *
 * @param arr object collection
 * @param obj full object or { id } stub to compare against
 */
export function filterById<T extends HasId>(arr: T[], obj: HasId): T[] {
  return arr.filter(v => v.id !== obj.id);
}

/**
 * Returns a new array consisting of all members of input array
 * minus those matching `obj`, and plus `obj` itself.
 * Does not modify input array.
 * If no members match `obj`, `obj` is appended.
 * If a member matches `obj`, `obj` is inserted at the same index.
 *
 * @param arr object collection
 * @param obj object to be inserted
 */
export function extendById<T extends HasId>(arr: T[], obj: T): T[] {
  const idx = arr.findIndex(v => v.id === obj.id);
  return idx !== -1
    ? [...arr.slice(0, idx), obj, ...arr.slice(idx + 1)]
    : [...arr, obj];
}

/**
 * Looks for object in array collection.
 *
 * @param arr object collection.
 * @param id unique ID of desired object.
 */
export function findById<T extends HasId>(
  arr: T[],
  id: string | null,
  fallback: T | null = null,
): T | typeof fallback {
  return id != null
    ? arr.find(v => v.id === id) ?? fallback
    : fallback;
}

const isSimpleType = (v: any): boolean =>
  v == null
  || isString(v)
  || isNumber(v)
  || isBoolean(v)
  || isArray(v)
  || isPlainObject(v);

const simpleValue = (val: any) =>
  isSimpleType(val)
    ? val
    : `[${typeof val}]`;

export function sanitize(values: any, parse = true): any {
  const serialized = JSON.stringify(values ?? null, (_, v) => simpleValue(v));
  return parse ? JSON.parse(serialized) : serialized;
}

export function addInterceptors(axios: AxiosInstance): void {
  axios
    .interceptors
    .response
    .use(
      (response) => response,
      (e) => {
        const resp = get(e, 'response.data', e.message ?? null);
        const err = (resp instanceof Object) ? JSON.stringify(resp) : resp;
        const url = get(e, 'response.config.url');
        const method = get(e, 'response.config.method');
        const status = get(e, 'response.status');
        const msg = `[HTTP ERROR] method=${method}, url=${url}, status=${status}, response=${err}`;
        return Promise.reject(new Error(msg));
      });
}
