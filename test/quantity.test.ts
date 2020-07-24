import LibQty from 'js-quantities';

import { qty } from '../src/quantity';
import { JSONQuantity } from '../src/types';


const wrap = (value: number, unit: string): JSONQuantity => ({
  __bloxtype: 'Quantity',
  value,
  unit,
});

describe('Check creating units', () => {

  it('Should recognize used unit types', () => {
    expect(LibQty(1, 'degC').isCompatible('degF')).toBe(true);
    expect(LibQty(1, 'tempF').isCompatible('degF')).toBe(true);
    expect(LibQty(1, '1 / degC').isCompatible('1/degF'));
    expect(LibQty(1, 'degC /hour').isCompatible('degF / minute'));
    expect(LibQty(1, 'degC *hour').isCompatible('degF * second'));
    expect(() => LibQty('1h10m')).toThrow();
  });

  it('Should get correct values from lib qty', () => {
    expect(LibQty(100, 'degC').scalar).toBe(100);
    expect(LibQty(100, 'degC').add(LibQty(10, 'degF')).scalar).toBeCloseTo(105.5555);
    expect(LibQty(100, 'tempC').add(LibQty(10, 'degC')).scalar).toBe(110);
  });

  it('Should create wrappers from diverse args', () => {
    expect(qty(10, 'degC').value).toBe(10);
    expect(qty(wrap(-2.5, 'delta_degC')).unit).toBe('delta_degC');
    expect(qty(wrap(1234, 'second')).copy().value).toBe(1234);
    expect(qty('1d28m').unit).toBe('ms');

    // ts-expect-error doesn't work on ts-jest errors
    expect(() => qty(10, null as any)).toThrow(/No unit set/);
    // @ts-expect-error
    expect(qty(wrap(1, 'degC'), 'degC').unit).toBe('degC');
    // @ts-expect-error
    expect(() => qty(wrap(1, 'degC'), 'degF')).toThrow(/Multiple units set/);
  });
});

describe('Check manipulating quantities', () => {

  it('Should compare quantities', () => {
    expect(qty(10, 'degC').gt(11, 'degF')).toBe(true);
    expect(qty(10, 'degC').isGreaterThan(11, 'degF')).toBe(true);
    expect(qty(2, 'h').gt(100, 'mins')).toBe(true);
    expect(qty('1d8h').gt(10, 'd')).toBe(false);
    expect(qty('1d8h').isGreaterThan(10, 'd')).toBe(false);
  });

  it('Should calculate quantities', () => {
    expect(qty(100, 'degC').plus(10, 'delta_degC').value).toBe(110);
    expect(qty(100, 'degC').plus(10, 'delta_degF').value).toBeCloseTo(105.5555);
    expect(qty(100, 'degC').minus(10, 'delta_degF').value).toBeCloseTo(94.44444);
    expect(qty(10, '1/degC').mul(2, '1/degC').value).toBe(20);
  });

  it('Should convert quantities', () => {
    expect(qty(10, 'min').to('s')).toMatchObject({ value: 600, unit: 's' });
    expect(qty('10m').to('s')).toMatchObject({ value: 600, unit: 's' });
    expect(qty(10, 'delta_degC').to('delta_degF')).toMatchObject({ value: 18, unit: 'delta_degF' });
  });
});
