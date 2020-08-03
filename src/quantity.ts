import LibQty from 'js-quantities';
import isFinite from 'lodash/isFinite';
import lodashRound from 'lodash/round';

import { isJSONQuantity } from './bloxfield';
import { durationMs, isDurationString } from './duration';
import { JSONQuantity } from './types';
import { checkCompatible, findGroup } from './unit-groups';

type WrapperValue = JSONQuantity | number | string | null;
type LoggerFunc = (...args: any[]) => void;
interface HasLogger {
  logFunc: LoggerFunc;
}

const round = (value: number | null, precision = 3): number | null =>
  value !== null
    ? lodashRound(value, precision)
    : null;

const libUnit = (unit: string): string =>
  findGroup(unit)?.convert(unit) ?? unit;

export const toLibQty = (v: JSONQuantity): LibQty => {
  if (v.value == null) {
    throw new Error('No value set');
  }
  return LibQty(v.value, libUnit(v.unit)!);
};

export const isQuantity =
  (obj: any): obj is Quantity =>
    obj instanceof Object
    && obj.__bloxtype === 'Quantity'
    && typeof obj.toJSON === 'function';

const fromArgs =
  (value: number | null, unit: string, readonly?: boolean): JSONQuantity => ({
    __bloxtype: 'Quantity',
    value,
    unit,
    readonly,
  });

const tryFromQuantity =
  (value: any): JSONQuantity | null =>
    isJSONQuantity(value)
      ? fromArgs(value.value, value.unit, value.readonly)
      : null;

const tryFromDuration =
  (value: any): JSONQuantity | null =>
    isDurationString(value)
      ? fromArgs(durationMs(value) / 1000, 's')
      : null;

const rawQty = (value: WrapperValue, unit?: string): JSONQuantity =>
  null
  ?? tryFromQuantity(value)
  ?? tryFromDuration(value)
  ?? fromArgs(value as number, unit as string);

const qtyArgFormatter = (value: WrapperValue, unit?: string): string => {
  const q = rawQty(value, unit);
  return `${round(q.value)}, '${q.unit}'`;
};

/**
 * Function decorator to take care of boilerplate involved in logging a call.
 * The wrapper function calls the wrappee, and then logs a formatted description of args + result.
 * If wrappee throws an error, it is caught, logged, and rethrown.
 * A formatter for the function arguments must be provided.
 *
 * @param argFormatter is called with decorated function arguments to handle string formatting.
 */
function logged(argFormatter: ((...args: any[]) => string)) {
  return function (target: HasLogger, name: string, desc: PropertyDescriptor): PropertyDescriptor {
    const func: Function = desc.value;

    // declared as function(){} to use call-site 'this'
    desc.value = function (...args: any[]) {
      const callStr = `${this}.${name}(${argFormatter(...args)})`;
      try {
        const result = func.apply(this, args);
        this.logFunc(callStr, result);
        return result;
      }
      catch (e) {
        this.logFunc(callStr, `${e}`);
        throw e;
      }
    };
    return desc;
  };
}

export class Quantity implements JSONQuantity, HasLogger {
  public __bloxtype: 'Quantity' = 'Quantity';
  public value: number | null;
  public unit: string;
  public readonly: boolean;
  public logFunc: LoggerFunc = (() => { void 0; })

  public constructor(value: number | null, unit: string);
  public constructor(value: string); // duration
  public constructor(value: JSONQuantity);
  public constructor(value: WrapperValue, unit?: string);
  public constructor(value: WrapperValue, unit?: string) {
    const obj = rawQty(value, unit);

    if (obj.value && !isFinite(obj.value)) {
      throw new Error(`Value '${obj.value}' is not a number or null. (unit=${obj.unit}).`);
    }

    if (!obj.unit) {
      throw new Error(`No unit set. (value=${obj.value}).`);
    }

    if (unit && unit !== obj.unit) {
      throw new Error(`Multiple units set: '${obj.unit}' and '${unit}'. (value=${obj.value}).`);
    }

    this.value = obj.value;
    this.unit = obj.unit;
    this.readonly = obj.readonly ?? false;
  }

  public toJSON(): JSONQuantity {
    return {
      __bloxtype: 'Quantity',
      value: this.value,
      unit: this.unit,
      readonly: this.readonly,
    };
  }

  public toString(): string {
    return `qty(${round(this.value)}, '${this.unit}')`;
  }

  public copy(value?: number | null, unit?: string): Quantity {
    const other = new Quantity({
      ...this.toJSON(),
      value: value !== undefined ? value : this.value, // null is valid
      unit: unit ?? this.unit,
    });
    other.logFunc = this.logFunc;
    return other;
  }

  @logged(v => `'${v}'`)
  public to(unit: string): Quantity {
    const converted = toLibQty(this).to(libUnit(unit));
    return this.copy(converted.scalar, unit);
  }

  @logged(qtyArgFormatter)
  public eq(value: WrapperValue, unit?: string): boolean {
    const other = new Quantity(value, unit);
    checkCompatible(this, other);
    return toLibQty(this).eq(toLibQty(other));
  }

  @logged(qtyArgFormatter)
  public lt(value: WrapperValue, unit?: string): boolean {
    const other = new Quantity(value, unit);
    checkCompatible(this, other);
    return toLibQty(this).lt(toLibQty(other));
  }

  @logged(qtyArgFormatter)
  public lte(value: WrapperValue, unit?: string): boolean {
    const other = new Quantity(value, unit);
    checkCompatible(this, other);
    return toLibQty(this).lte(toLibQty(other));
  }

  @logged(qtyArgFormatter)
  public gt(value: WrapperValue, unit?: string): boolean {
    const other = new Quantity(value, unit);
    checkCompatible(this, other);
    return toLibQty(this).gt(toLibQty(other));
  }

  @logged(qtyArgFormatter)
  public gte(value: WrapperValue, unit?: string): boolean {
    const other = new Quantity(value, unit);
    checkCompatible(this, other);
    return toLibQty(this).gte(toLibQty(other));
  }

  @logged(qtyArgFormatter)
  public compareTo(value: WrapperValue, unit?: string): -1 | 0 | 1 {
    const other = new Quantity(value, unit);
    checkCompatible(this, other);
    return toLibQty(this).compareTo(toLibQty(other));
  }

  @logged(qtyArgFormatter)
  public plus(value: WrapperValue, unit?: string): Quantity {
    const other = new Quantity(value, unit);
    const result = toLibQty(this).add(toLibQty(other));
    return this.copy(result.scalar);
  }

  @logged(qtyArgFormatter)
  public minus(value: WrapperValue, unit?: string): Quantity {
    const other = new Quantity(value, unit);
    const result = toLibQty(this).sub(toLibQty(other));
    return this.copy(result.scalar);
  }

  // Convenience aliases
  public isEqualTo = this.eq;
  public isGreaterThan = this.gt;
  public isLessThan = this.lt;
}

export function qty(value: JSONQuantity): Quantity;
export function qty(value: string): Quantity;
export function qty(value: number | null, unit: string): Quantity;
export function qty(value: WrapperValue, unit?: string): Quantity {
  // Let the constructor handle invalid combinations of args
  return new Quantity(value as any, unit as any);
}

// allows injecting a logger function into qty()
// the logger will be passed to all copy instances
export function qtyFactory(logFunc: LoggerFunc): typeof qty {
  return (value: any, unit?: any): Quantity => {
    const q = qty(value, unit);
    q.logFunc = logFunc;
    return q;
  };
}
