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

declare const parse: (json: string, types?: SerializableTypes) => any;
type Reviver$1 = (this: any, key: string, value: any) => any;
declare const createReviver: (types?: SerializableTypes, registerReplacement?: (target: any, key: string, value: unknown) => void) => Reviver$1;

declare const stringify: (value: unknown, types?: SerializableTypes) => string;
type Replacer$1 = (this: any, key: string, value: any) => any;
declare const createReplacer: (types?: SerializableTypes) => Replacer$1;

declare const setGlobalTypes: (types: SerializableTypes) => void;

declare const $mockdate: Serializable<Date, string>;

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

export { $mockdate, type Serializable, createReplacer, createReviver, createSafeNumberReplacer, createSafeNumberReviver, parse, patch, safeNumberParse, safeNumberStringify, setGlobalTypes, stringify, unpatch };
