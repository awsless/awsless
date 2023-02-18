import { IBigFloat } from 'bigfloat-esnext';
export { IBigFloat, evaluate, fraction, is_big_float, is_integer, is_negative, is_number, is_positive, is_zero, scientific, set_precision } from 'bigfloat-esnext';

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
declare const mul: (multiplicand: Numeric, multiplier: Numeric) => BigFloat;
declare const div: (dividend: Numeric, divisor: Numeric, precision?: number) => BigFloat;
declare const sqrt: (a: Numeric) => BigFloat;
declare const ceil: (a: Numeric, precision?: number, divisorPrecision?: number) => BigFloat;
declare const floor: (a: Numeric, precision?: number, divisorPrecision?: number) => BigFloat;
declare const pow: (base: Numeric, exp: Numeric) => BigFloat;

declare const eq: (a: Numeric, b: Numeric) => boolean;
declare const lt: (a: Numeric, b: Numeric) => boolean;
declare const lte: (a: Numeric, b: Numeric) => boolean;
declare const gt: (a: Numeric, b: Numeric) => boolean;
declare const gte: (a: Numeric, b: Numeric) => boolean;

export { BigFloat, Numeric, abs, add, ceil, div, eq, floor, gt, gte, lt, lte, mul, neg, pow, sqrt, sub };
