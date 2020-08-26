import { JSONBloxField, JSONLink, JSONQuantity } from './types';

export const isBloxField =
  (obj: any): obj is JSONBloxField =>
    obj instanceof Object
    && typeof obj.__bloxtype === 'string';

export const isJSONQuantity =
  (obj: any): obj is JSONQuantity =>
    isBloxField(obj)
    && obj.__bloxtype === 'Quantity';

export const isJSONLink =
  (obj: any): obj is JSONLink =>
    isBloxField(obj)
    && obj.__bloxtype === 'Link';
