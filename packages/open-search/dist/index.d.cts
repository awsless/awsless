import * as types from '@opensearch-project/opensearch/api/types';
export { types as Types };
import { ClientOptions, Client } from '@opensearch-project/opensearch';
import { Client as Client$1 } from '@opensearch-project/opensearch/.';
import { Numeric, BigFloat } from '@awsless/big-float';

type Type = 'keyword' | 'text' | 'double' | 'long' | 'boolean' | 'date';
type AnySchema = Schema<any, any, any>;
type Fields = Record<string, Mapping>;
type Mapping = {
    type: Type;
    fields?: Fields;
} | {
    properties: Record<string, Mapping>;
};
type SchemaProps = {
    type?: Type;
    fields?: Fields;
};
declare class Schema<Encoded, Input, Output> {
    readonly encode: (value: Input) => Encoded;
    readonly decode: (value: Encoded) => Output;
    readonly mapping: Mapping;
    readonly ENCODED: Encoded;
    readonly INPUT: Input;
    readonly OUTPUT: Output;
    constructor(encode: (value: Input) => Encoded, decode: (value: Encoded) => Output, mapping: Mapping);
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

type Options$5 = {
    version?: VersionArgs;
    debug?: boolean;
};
declare const mockOpenSearch: ({ version, debug }?: Options$5) => void;

type Table<I extends string, S extends AnySchema> = {
    index: I;
    schema: S;
    client: () => Client$1;
};
type AnyTable = Table<string, AnySchema>;
declare const define: <I extends string, S extends AnySchema>(index: I, schema: S, client: () => Client$1) => Table<I, S>;

type Options$4 = {
    refresh?: boolean;
};
declare const bulk: <T extends AnyTable>(table: T, items: Array<{
    action: "create" | "update" | "index";
    id: string;
    item: T["schema"]["INPUT"];
} | {
    action: "delete";
    id: string;
}>, { refresh }?: Options$4) => Promise<void>;
declare class BulkError extends Error {
    readonly items: BulkItemError[];
    constructor(items: BulkItemError[]);
}
declare class BulkItemError extends Error {
    readonly index: string;
    readonly id: string;
    readonly type: string;
    constructor(index: string, id: string, type: string, message: string);
}

type Options$3 = {
    query?: unknown;
    aggs?: unknown;
    limit?: number;
    cursor?: string;
    sort?: unknown;
    trackTotalHits?: boolean;
};
type Response<T extends AnyTable> = {
    cursor?: string;
    found: number;
    count: number;
    items: T['schema']['OUTPUT'][];
};
declare const search: <T extends AnyTable>(table: T, { query, aggs, limit, cursor, sort, trackTotalHits }: Options$3) => Promise<Response<T>>;

type Options$2 = {
    refresh?: boolean;
};
declare const indexItem: <T extends AnyTable>(table: T, id: string, item: T["schema"]["INPUT"], { refresh }?: Options$2) => Promise<void>;

type Options$1 = {
    refresh?: boolean;
};
declare const deleteItem: <T extends AnyTable>(table: T, id: string, { refresh }?: Options$1) => Promise<void>;

type Options = {
    refresh?: boolean;
};
declare const updateItem: <T extends AnyTable>(table: T, id: string, item: Partial<T["schema"]["INPUT"]>, { refresh }?: Options) => Promise<void>;

declare const createIndex: (table: AnyTable) => Promise<void>;

declare const deleteIndex: (table: AnyTable) => Promise<void>;

declare const array: <S extends AnySchema>(struct: S) => Schema<S["ENCODED"][], S["INPUT"][], S["OUTPUT"][]>;

declare const bigfloat: (props?: SchemaProps) => Schema<string, Numeric, BigFloat>;

declare const bigint: (props?: SchemaProps) => Schema<string, bigint, bigint>;

declare const boolean: (props?: SchemaProps) => Schema<boolean, boolean, boolean>;

declare const date: (props?: SchemaProps) => Schema<string, Date, Date>;

declare const number: (props?: SchemaProps) => Schema<string, number, number>;

type Entries = Record<string, AnySchema>;
type InferInput<S extends Entries> = {
    [K in keyof S]: S[K]['INPUT'];
};
type InferOutput<S extends Entries> = {
    [K in keyof S]: S[K]['OUTPUT'];
};
type InferEncoded<S extends Entries> = {
    [K in keyof S]: S[K]['ENCODED'];
};
declare const object: <T extends Entries>(entries: T) => Schema<InferEncoded<T>, InferInput<T>, InferOutput<T>>;

declare const set: <S extends AnySchema>(struct: S) => Schema<S["ENCODED"][], Set<S["INPUT"]>, Set<S["OUTPUT"]>>;

declare const string: <T extends string>(props?: SchemaProps) => Schema<string, T, T>;

declare const uuid: (props?: SchemaProps) => Schema<`${string}-${string}-${string}-${string}-${string}`, `${string}-${string}-${string}-${string}-${string}`, `${string}-${string}-${string}-${string}-${string}`>;

export { type AnySchema, type AnyTable, BulkError, BulkItemError, type Mapping, Schema, type SchemaProps, type Table, array, bigfloat, bigint, boolean, bulk, createIndex, date, define, deleteIndex, deleteItem, indexItem, mockOpenSearch, number, object, search, searchClient, set, string, updateItem, uuid };
