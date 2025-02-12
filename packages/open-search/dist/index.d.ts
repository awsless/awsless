import * as types from '@opensearch-project/opensearch/api/types';
export { types as Types };
import { ClientOptions, Client } from '@opensearch-project/opensearch';
import { Client as Client$1 } from '@opensearch-project/opensearch/.';
import { Numeric, BigFloat } from '@awsless/big-float';

type Type = 'keyword' | 'text' | 'double' | 'long' | 'boolean' | 'date';
type AnyStruct = Struct<any, any, any>;
type Props = {
    type: Type;
    fields?: {
        sort: {
            type: 'keyword';
        };
    };
} | {
    properties: Record<string, Props>;
};
declare class Struct<Encoded, Input, Output> {
    readonly encode: (value: Input) => Encoded;
    readonly decode: (value: Encoded) => Output;
    readonly props: Props;
    readonly ENCODED: Encoded;
    readonly INPUT: Input;
    readonly OUTPUT: Output;
    constructor(encode: (value: Input) => Encoded, decode: (value: Encoded) => Output, props: Props);
}

declare const searchClient: (options?: ClientOptions, service?: "es" | "aoss") => Client;

type Settings = Record<string, string | number | boolean>;

type Version = `${string}.${string}.${string}`;
type VersionArgs = {
    version: Version;
    settings: (opts: {
        port: number;
        host: string;
        cache: string;
    }) => Settings;
    started: (line: string) => boolean;
};

type Options$4 = {
    version?: VersionArgs;
    debug?: boolean;
};
declare const mockOpenSearch: ({ version, debug }?: Options$4) => void;

type Table<I extends string, S extends AnyStruct> = {
    index: I;
    schema: S;
    client: () => Client$1;
};
type AnyTable = Table<string, AnyStruct>;
declare const define: <I extends string, S extends AnyStruct>(index: I, schema: S, client: () => Client$1) => Table<I, S>;

type Options$3 = {
    refresh?: boolean;
};
declare const indexItem: <T extends AnyTable>(table: T, id: string, item: T["schema"]["INPUT"], { refresh }?: Options$3) => Promise<void>;

type Options$2 = {
    refresh?: boolean;
};
declare const deleteItem: <T extends AnyTable>(table: T, id: string, { refresh }?: Options$2) => Promise<void>;

type Options$1 = {
    refresh?: boolean;
};
declare const updateItem: <T extends AnyTable>(table: T, id: string, item: Partial<T["schema"]["INPUT"]>, { refresh }?: Options$1) => Promise<void>;

declare const migrate: (table: AnyTable) => Promise<void>;

type Options = {
    query?: unknown;
    aggs?: unknown;
    limit?: number;
    cursor?: string;
    sort?: unknown;
};
type Response<T extends AnyTable> = {
    cursor?: string;
    found: number;
    count: number;
    items: T['schema']['OUTPUT'][];
};
declare const search: <T extends AnyTable>(table: T, { query, aggs, limit, cursor, sort }: Options) => Promise<Response<T>>;

declare const array: <S extends AnyStruct>(struct: S) => Struct<S["ENCODED"][], S["INPUT"][], S["OUTPUT"][]>;

declare const bigfloat: () => Struct<string, Numeric, BigFloat>;

declare const bigint: () => Struct<string, bigint, bigint>;

declare const boolean: () => Struct<boolean, boolean, boolean>;

declare const date: () => Struct<string, Date, Date>;

declare const enums: <T extends string>() => Struct<string, T, T>;

declare const number: () => Struct<string, number, number>;

type Schema = Record<string, AnyStruct>;
type InferInput<S extends Schema> = {
    [K in keyof S]: S[K]['INPUT'];
};
type InferOutput<S extends Schema> = {
    [K in keyof S]: S[K]['OUTPUT'];
};
type InferEncoded<S extends Schema> = {
    [K in keyof S]: S[K]['ENCODED'];
};
declare const object: <S extends Schema>(schema: S) => Struct<InferEncoded<S>, InferInput<S>, InferOutput<S>>;

declare const set: <S extends AnyStruct>(struct: S) => Struct<S["ENCODED"][], Set<S["INPUT"]>, Set<S["OUTPUT"]>>;

declare const string: () => Struct<string, string, string>;

declare const uuid: () => Struct<`${string}-${string}-${string}-${string}-${string}`, `${string}-${string}-${string}-${string}-${string}`, `${string}-${string}-${string}-${string}-${string}`>;

declare const version = "2";

export { type AnyStruct, type AnyTable, type Props, Struct, type Table, array, bigfloat, bigint, boolean, date, define, deleteItem, enums, indexItem, migrate, mockOpenSearch, number, object, search, searchClient, set, string, updateItem, uuid, version };
