import { JSONBloxField, JSONLink, JSONQuantity } from './types';

export const isBloxField =
  (obj: any): obj is JSONBloxField =>
    obj != null
    && typeof obj === 'object'
    && typeof obj.__bloxtype === 'string';

export const isJSONQuantity =
  (obj: any): obj is JSONQuantity =>
    obj != null
    && typeof obj === 'object'
    && obj.__bloxtype === 'Quantity';

export const isJSONLink =
  (obj: any): obj is JSONLink =>
    obj != null
    && typeof obj === 'object'
    && obj.__bloxtype === 'Link';
