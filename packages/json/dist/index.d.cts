import { BigFloat } from "@awsless/big-float";
import { Duration } from "@awsless/duration";
//#region src/type/index.d.ts
type Serializable<I, O> = {
  is: (value: unknown) => boolean;
  stringify: (value: I) => O;
} & ({
  parse: (value: O) => I;
} | {
  replace: (value: O) => I;
});
type SerializableTypes = Record<string, Serializable<any, any>>;
//#endregion
//#region src/patch.d.ts
declare const patch: (value: unknown, types?: SerializableTypes) => any;
declare const unpatch: (value: unknown, types?: SerializableTypes) => any;
//#endregion
//#region src/parse.d.ts
type Options$1 = {
  types?: SerializableTypes;
};
declare const parse: (json: string, options?: Options$1) => any;
type Reviver$1 = (this: any, key: string, value: any) => any;
declare const createReviver: (types?: SerializableTypes, registerReplacement?: (target: any, key: string, value: unknown) => void) => Reviver$1;
//#endregion
//#region src/stringify.d.ts
type Options = {
  types?: SerializableTypes;
  preserveUndefinedValues?: boolean;
};
declare const stringify: (value: unknown, options?: Options) => string;
type Replacer$1 = (this: any, key: string, value: any) => any;
declare const createReplacer: (options?: Options) => Replacer$1;
//#endregion
//#region src/global.d.ts
declare const setGlobalTypes: (types: SerializableTypes) => void;
//#endregion
//#region src/safe-number/parse.d.ts
type Props$1 = {
  parse: (value: string) => unknown;
};
declare const safeNumberParse: (json: string, props: Props$1) => any;
type Reviver = (this: any, key: string, value: any, context: {
  source: string;
}) => any;
declare const createSafeNumberReviver: (props: Props$1) => Reviver;
//#endregion
//#region src/safe-number/stringify.d.ts
type Props<T> = {
  is: (value: unknown) => value is T;
  stringify: (value: T) => string;
};
declare const safeNumberStringify: <T>(value: unknown, props: Props<T>) => string;
type Replacer = (this: any, key: string, value: any) => any;
declare const createSafeNumberReplacer: <T>(props: Props<T>) => Replacer;
//#endregion
//#region src/type/bigfloat.d.ts
declare const $bigfloat: Serializable<BigFloat, string>;
//#endregion
//#region src/type/bigint.d.ts
declare const $bigint: Serializable<bigint, string>;
//#endregion
//#region src/type/binary.d.ts
declare const $binary: Serializable<Uint8Array, string>;
//#endregion
//#region src/type/date.d.ts
declare const $date: Serializable<Date, string>;
//#endregion
//#region src/type/duration.d.ts
declare const $duration: Serializable<Duration, string>;
//#endregion
//#region src/type/infinity.d.ts
declare const $infinity: Serializable<typeof Infinity, 1 | 0>;
//#endregion
//#region src/type/map.d.ts
declare const $map: Serializable<Map<unknown, unknown>, [unknown, unknown][]>;
//#endregion
//#region src/type/mockdate.d.ts
declare const $mockdate: Serializable<Date, string>;
//#endregion
//#region src/type/nan.d.ts
declare const $nan: Serializable<typeof NaN, 0>;
//#endregion
//#region src/type/regexp.d.ts
declare const $regexp: Serializable<RegExp, [string, string]>;
//#endregion
//#region src/type/set.d.ts
declare const $set: Serializable<Set<unknown>, unknown[]>;
//#endregion
//#region src/type/undefined.d.ts
declare const $undefined: Serializable<undefined, 0>;
//#endregion
//#region src/type/url.d.ts
declare const $url: Serializable<URL, string>;
//#endregion
export { $bigfloat, $bigint, $binary, $date, $duration, $infinity, $map, $mockdate, $nan, $regexp, $set, $undefined, $url, type Serializable, createReplacer, createReviver, createSafeNumberReplacer, createSafeNumberReviver, parse, patch, safeNumberParse, safeNumberStringify, setGlobalTypes, stringify, unpatch };