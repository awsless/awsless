import { BigFloat } from '@awsless/big-float';
import { Duration } from '@awsless/duration';

type Serializable<I, O> = {
    is: (value: unknown) => boolean;
    stringify: (value: I) => O;
} & ({
    parse: (value: O) => I;
} | {
    replace: (value: O) => I;
});
type SerializableTypes = Record<string, Serializable<any, any>>;

declare const patch: (value: unknown, types?: SerializableTypes) => any;
declare const unpatch: (value: unknown, types?: SerializableTypes) => any;

type Options$1 = {
    types?: SerializableTypes;
};
declare const parse: (json: string, options?: Options$1) => any;
type Reviver$1 = (this: any, key: string, value: any) => any;
declare const createReviver: (types?: SerializableTypes, registerReplacement?: (target: any, key: string, value: unknown) => void) => Reviver$1;

type Options = {
    types?: SerializableTypes;
    preserveUndefinedValues?: boolean;
};
declare const stringify: (value: unknown, options?: Options) => string;
type Replacer$1 = (this: any, key: string, value: any) => any;
declare const createReplacer: (options?: Options) => Replacer$1;

declare const setGlobalTypes: (types: SerializableTypes) => void;

type Props$1 = {
    parse: (value: string) => unknown;
};
declare const safeNumberParse: (json: string, props: Props$1) => any;
type Reviver = (this: any, key: string, value: any, context: {
    source: string;
}) => any;
declare const createSafeNumberReviver: (props: Props$1) => Reviver;

type Props<T> = {
    is: (value: unknown) => value is T;
    stringify: (value: T) => string;
};
declare const safeNumberStringify: <T>(value: unknown, props: Props<T>) => string;
type Replacer = (this: any, key: string, value: any) => any;
declare const createSafeNumberReplacer: <T>(props: Props<T>) => Replacer;

declare const $bigfloat: Serializable<BigFloat, string>;

declare const $bigint: Serializable<bigint, string>;

declare const $binary: Serializable<Uint8Array, string>;

declare const $date: Serializable<Date, string>;

declare const $duration: Serializable<Duration, string>;

declare const $infinity: Serializable<typeof Infinity, 1 | 0>;

declare const $map: Serializable<Map<unknown, unknown>, [unknown, unknown][]>;

declare const $mockdate: Serializable<Date, string>;

declare const $nan: Serializable<typeof NaN, 0>;

declare const $regexp: Serializable<RegExp, [string, string]>;

declare const $set: Serializable<Set<unknown>, unknown[]>;

declare const $undefined: Serializable<undefined, 0>;

declare const $url: Serializable<URL, string>;

export { $bigfloat, $bigint, $binary, $date, $duration, $infinity, $map, $mockdate, $nan, $regexp, $set, $undefined, $url, type Serializable, createReplacer, createReviver, createSafeNumberReplacer, createSafeNumberReviver, parse, patch, safeNumberParse, safeNumberStringify, setGlobalTypes, stringify, unpatch };
