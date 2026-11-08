import Decimal from 'decimal.js';

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export type Money = Decimal;
export const money = (val: string | number): Money => new Decimal(val);
export const add = (a: Money, b: Money): Money => a.plus(b);
export const sub = (a: Money, b: Money): Money => a.minus(b);
export const mul = (a: Money, b: Money): Money => a.times(b);
export const div = (a: Money, b: Money): Money => a.dividedBy(b);
export const round = (a: Money, dp = 2): Money => a.toDecimalPlaces(dp);
export const toDb = (a: Money): string => a.toFixed(6);
export const fromDb = (s: string): Money => money(s);
export const eq = (a: Money, b: Money): boolean => a.equals(b);
export const gt = (a: Money, b: Money): boolean => a.greaterThan(b);
export const isZero = (a: Money): boolean => a.isZero();
