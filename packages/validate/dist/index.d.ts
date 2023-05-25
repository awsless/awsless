import { Struct } from 'superstruct';
export { Coercer, Context, Describe, Failure, Infer, Refiner, Result, Struct, StructError, Validator, any, array, assert, assign, bigint, boolean, coerce, create, defaulted, define, deprecated, dynamic, empty, enums, func, instance, integer, intersection, is, lazy, literal, map, mask, max, min, never, nonempty, nullable, number, object, omit, optional, partial, pattern, pick, record, refine, regexp, set, size, string, struct, trimmed, tuple, type, union, unknown } from 'superstruct';
import { BigFloat } from '@awsless/big-float';
import { UUID } from 'crypto';

declare const bigfloat: () => Struct<BigFloat, null>;
declare const positive: <T extends number | BigFloat, S extends unknown>(struct: Struct<T, S>) => Struct<T, S>;
declare const precision: <T extends number | BigFloat, S extends unknown>(struct: Struct<T, S>, decimals: number) => Struct<T, S>;

declare const date: () => Struct<Date, null>;

declare const uuid: () => Struct<UUID, null>;

declare const json: <T, S>(struct: Struct<T, S>) => Struct<T, S>;

declare const lowercase: <T, S>(struct: Struct<T, S>) => Struct<T, S>;
declare const uppercase: <T, S>(struct: Struct<T, S>) => Struct<T, S>;

declare function unique<T extends any[], S extends any>(struct: Struct<T, S>, compare?: (a: T[number], b: T[number]) => boolean): Struct<T, S>;

export { bigfloat, date, json, lowercase, positive, precision, unique, uppercase, uuid };
