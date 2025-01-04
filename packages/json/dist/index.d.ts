type Serializable<I, O> = {
    is: (value: unknown) => value is I;
    parse: (value: O) => I;
    stringify: (value: I) => O;
};
type SerializableTypes = Record<string, Serializable<any, any>>;

declare const patch: (value: unknown, types?: SerializableTypes) => any;
declare const unpatch: (value: unknown, types?: SerializableTypes) => any;

declare const parse: (json: string, types?: SerializableTypes) => any;
type Reviver = (this: any, key: string, value: any) => any;
declare const createReviver: (types?: SerializableTypes) => Reviver;

declare const stringify: (value: unknown, types?: SerializableTypes) => string;
type Replacer = (this: any, key: string, value: any) => any;
declare const createReplacer: (types?: SerializableTypes) => Replacer;

export { type Serializable, createReplacer, createReviver, parse, patch, stringify, unpatch };
