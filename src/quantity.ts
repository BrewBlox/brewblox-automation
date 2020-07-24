import LibQty from 'js-quantities';
import isFinite from 'lodash/isFinite';
import isObject from 'lodash/isObject';

import { durationMs, isDurationString } from './duration';
import { JSONQuantity } from './types';


type WrapperValue = JSONQuantity | number | string | null;

interface UnitGroup {
  name: string;
  example: string;
  test: (s: string) => boolean;
  convert: (s: string) => string;
}

const groups: UnitGroup[] = [
  {
    name: 'Time',
    example: 'second',
    test: s => /^(ms|milliseconds?|s|seconds?|mins?|minutes?|h|hours?|d|days?)$/.test(s),
    convert: s => s,
  },
  {
    name: 'Temp',
    example: 'degC',
    test: s => /^deg(F|C)$/i.test(s),
    convert: s => s.replace('deg', 'temp'),
  },
  {
    name: 'Delta Temp',
    example: 'delta_degC',
    test: s => /^delta_deg(F|C)$/i.test(s),
    convert: s => s.replace('delta_', ''),
  },
  {
    name: 'Inverse Temp',
    example: '1 / degC',
    test: s => /^1 ?\/ ?deg(F|C)$/i.test(s),
    convert: s => s,
  },
  {
    name: 'Delta Temp / Time',
    example: 'delta_degC / second',
    test: s => /^delta_deg(F|C) ?\/ ?(s|seconds?|mins?|minutes?|h|hours?|d|days?)$/i.test(s),
    convert: s => s.replace('delta_', ''),
  },
  {
    name: 'Delta Temp * Time',
    example: 'delta_degC * second',
    test: s => /^delta_deg(F|C) ?\* ?(s|seconds?|mins?|minutes?|h|hours?|d|days?)$/i.test(s),
    convert: s => s.replace('delta_', ''),
  },
];

const findGroup = (unit?: string): UnitGroup | null =>
  unit
    ? groups.find(g => g.test(unit)) ?? null
    : null;

const libUnit = (unit: string): string =>
  findGroup(unit)?.convert(unit) ?? unit;

const toLibQty = (v: JSONQuantity): LibQty => {
  if (v.value == null) {
    throw new Error('No value set');
  }
  return LibQty(v.value, libUnit(v.unit)!);
};

export const isJSONQuantity =
  (obj: any): obj is JSONQuantity =>
    isObject(obj) && '__bloxtype' in obj && !('toJSON' in obj);

export const isQuantity =
  (obj: any): obj is Quantity =>
    isObject(obj) && '__bloxtype' in obj && 'toJSON' in obj;

const fromArgs =
  (value: number | null, unit: string): JSONQuantity => ({
    __bloxtype: 'Quantity',
    value,
    unit,
  });

const tryFromJSON =
  (value: any): JSONQuantity | null =>
    isQuantity(value)
      ? value.toJSON()
      : isJSONQuantity(value)
        ? { ...value }
        : null;

const tryFromDuration =
  (value: any): JSONQuantity | null =>
    isDurationString(value)
      ? fromArgs(durationMs(value) / 1000, 's')
      : null;

export class Quantity implements JSONQuantity {
  public __bloxtype: 'Quantity';
  public value: number | null;
  public unit: string;
  public readonly: boolean;

  public constructor(value: number | null, unit: string);
  public constructor(value: string); // duration
  public constructor(value: JSONQuantity);
  public constructor(value: WrapperValue, unit?: string);
  public constructor(value: WrapperValue, unit?: string) {
    const obj: JSONQuantity = null
      ?? tryFromJSON(value)
      ?? tryFromDuration(value)
      ?? fromArgs(value as number, unit as string);

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

  public copy(value?: number | null, unit?: string): Quantity {
    return new Quantity({
      ...this.toJSON(),
      value: value ?? this.value,
      unit: unit ?? this.unit,
    });
  }

  public lt(value: WrapperValue, unit?: string): boolean {
    const other = new Quantity(value, unit);
    return toLibQty(this).lt(toLibQty(other));
  }

  public lte(value: WrapperValue, unit?: string): boolean {
    const other = new Quantity(value, unit);
    return toLibQty(this).lte(toLibQty(other));
  }

  public gt(value: WrapperValue, unit?: string): boolean {
    const other = new Quantity(value, unit);
    return toLibQty(this).gt(toLibQty(other));
  }

  public gte(value: WrapperValue, unit?: string): boolean {
    const other = new Quantity(value, unit);
    return toLibQty(this).gte(toLibQty(other));
  }

  public compareTo(value: WrapperValue, unit?: string): -1 | 0 | 1 {
    const other = new Quantity(value, unit);
    return toLibQty(this).compareTo(toLibQty(other));
  }

  public to(unit: string): Quantity {
    const result = toLibQty(this).to(libUnit(unit));
    return this.copy(result.scalar, unit);
  }

  public plus(value: WrapperValue, unit?: string): Quantity {
    const other = new Quantity(value, unit);
    const result = toLibQty(this).add(toLibQty(other));
    return this.copy(result.scalar);
  }

  public minus(value: WrapperValue, unit?: string): Quantity {
    const other = new Quantity(value, unit);
    const result = toLibQty(this).sub(toLibQty(other));
    return this.copy(result.scalar);
  }

  public mul(value: WrapperValue, unit?: string): Quantity {
    const other = new Quantity(value, unit);
    const result = toLibQty(this).mul(toLibQty(other));
    return this.copy(result.scalar);
  }

  public div(value: WrapperValue, unit?: string): Quantity {
    const other = new Quantity(value, unit);
    const result = toLibQty(this).div(toLibQty(other));
    return this.copy(result.scalar);
  }

  // Convenience aliases
  public isGreaterThan = this.gt;
  public isLessThan = this.lt;
  public multiply = this.mul;
  public divide = this.div;
}

export function qty(value: JSONQuantity): Quantity;
export function qty(value: string): Quantity;
export function qty(value: number | null, unit: string): Quantity;
export function qty(value: WrapperValue, unit?: string): Quantity {
  // Let the constructor handle invalid combinations of args
  return new Quantity(value as any, unit as any);
}
