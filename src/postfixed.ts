import fromPairs from 'lodash/fromPairs';
import isArray from 'lodash/isArray';
import isObject from 'lodash/isObject';
import toPairs from 'lodash/toPairs';

import { isBloxField } from './bloxfield';
import { JSONBloxField, JSONLink, JSONQuantity } from './types';

// string start
// then any characters (captured)
// then a left bracket (captured)
// then any characters (captured)
// then a right bracket
// string end
// Example values:
//   'field<SetpointSensorPair,driven>'
//   'field2[degC]'
//   'field_underscored[1 / degC]'
const postfixExpr = /^(.*)([\[<])(.*)[\]>]$/;

export const stripPostFix = (key: string): string => key.replace(/[\[<].+/, '');

const wrapLink = (id: string | null, type: string, driven: boolean): JSONLink => ({
  __bloxtype: 'Link',
  id,
  type,
  driven,
});

const wrapQuantity = (value: number | null, unit: string): JSONQuantity => ({
  __bloxtype: 'Quantity',
  value,
  unit,
});

export function parseBloxField(key: string, val: any): [string, JSONBloxField] | null {
  if (isBloxField(val)) {
    return [key, val];
  }
  if (key && key.endsWith(']') || key.endsWith('>')) {
    const matched = key.match(postfixExpr);
    if (matched) {
      const [, name, leftBracket, bracketed] = matched;
      if (leftBracket === '<') {
        const [type, driven] = bracketed.split(',');
        return [name, wrapLink(val, type, !!driven)];
      }
      else if (leftBracket === '[') {
        return [name, wrapQuantity(val, bracketed)];
      }
    }
  }
  return null;
}

export function parseObject<T>(obj: T): T {
  if (isArray(obj)) {
    return (obj as any).map(parseObject);
  }
  if (isObject(obj)) {
    const pairs = toPairs(obj)
      .map(([key, val]) => parseBloxField(key, val) ?? [key, parseObject(val)]);
    return fromPairs(pairs) as T;
  }
  return obj;
}
