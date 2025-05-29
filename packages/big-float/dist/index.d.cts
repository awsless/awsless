import { IBigFloat } from 'bigfloat-esnext';
export { IBigFloat, evaluate, fraction, scientific, set_precision } from 'bigfloat-esnext';

type Numeric = IBigFloat | number | bigint | string;
declare class BigFloat implements IBigFloat {
    readonly exponent: number;
    readonly coefficient: bigint;
    constructor(number: Numeric);
    toJSON(): string;
    toString(radix?: Numeric): string;
}

declare const neg: (a: Numeric) => BigFloat;
declare const abs: (a: Numeric) => BigFloat;
declare const add: (a: Numeric, ...other: Numeric[]) => BigFloat;
declare const sub: (a: Numeric, ...other: Numeric[]) => BigFloat;
declare const mul: (multiplicand: Numeric, ...multipliers: Numeric[]) => BigFloat;
declare const div: (dividend: Numeric, divisor: Numeric, precision?: number) => BigFloat;
declare const sqrt: (a: Numeric) => BigFloat;
declare const ceil: (a: Numeric, precision?: number, divisorPrecision?: number) => BigFloat;
declare const floor: (a: Numeric, precision?: number, divisorPrecision?: number) => BigFloat;
declare const pow: (base: Numeric, exp: Numeric) => BigFloat;
declare const factor: (number: Numeric) => BigFloat;

declare const eq: (a: Numeric, b: Numeric) => boolean;
declare const lt: (a: Numeric, b: Numeric) => boolean;
declare const lte: (a: Numeric, b: Numeric) => boolean;
declare const gt: (a: Numeric, b: Numeric) => boolean;
declare const gte: (a: Numeric, b: Numeric) => boolean;
declare const min: (...values: Numeric[]) => BigFloat;
declare const max: (...values: Numeric[]) => BigFloat;
declare const minmax: (number: Numeric, min: Numeric, max: Numeric) => BigFloat;
declare const cmp: (a: Numeric, b: Numeric) => 0 | 1 | -1;

declare const isBigFloat: (number: unknown) => number is BigFloat;
declare const isInteger: (number: Numeric) => boolean;
declare const isNegative: (number: Numeric) => boolean;
declare const isPositive: (number: Numeric) => boolean;
declare const isZero: (number: Numeric) => boolean;

declare const ZERO: BigFloat;
declare const ONE: BigFloat;
declare const TWO: BigFloat;
declare const THREE: BigFloat;
declare const FOUR: BigFloat;
declare const FIVE: BigFloat;
declare const SIX: BigFloat;
declare const SEVEN: BigFloat;
declare const EIGHT: BigFloat;
declare const NINE: BigFloat;
declare const TEN: BigFloat;
declare const HUNDRED: BigFloat;
declare const THOUSAND: BigFloat;
declare const MILLION: BigFloat;
declare const BILLION: BigFloat;
declare const TRILLION: BigFloat;

export { BILLION, BigFloat, EIGHT, FIVE, FOUR, HUNDRED, MILLION, NINE, type Numeric, ONE, SEVEN, SIX, TEN, THOUSAND, THREE, TRILLION, TWO, ZERO, abs, add, ceil, cmp, div, eq, factor, floor, gt, gte, isBigFloat, isInteger, isNegative, isPositive, isZero, lt, lte, max, min, minmax, mul, neg, pow, sqrt, sub };
