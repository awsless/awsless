import { ClientOptions, Client } from '@opensearch-project/opensearch';
export { Types } from '@opensearch-project/opensearch';
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
type Options$5 = {
    path: string;
    host: string;
    port: number;
    debug?: boolean;
    version: VersionArgs;
};
declare const launch: ({ path, host, port, version, debug }: Options$5) => Promise<() => Promise<void>>;

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
declare const VERSION_3_5_0_MIN: VersionArgs;

type Options$4 = {
    version?: VersionArgs;
    debug?: boolean;
};
declare const mockOpenSearch: ({ version, debug }?: Options$4) => void;

declare const download: ({ version }: Pick<VersionArgs, "version">) => Promise<string>;

type Table<I extends string, S extends AnySchema> = {
    index: I;
    schema: S;
    client: () => Client;
};
type AnyTable = Table<string, AnySchema>;
declare const define: <I extends string, S extends AnySchema>(index: I, schema: S, client: () => Client) => Table<I, S>;

declare const bulkDeleteItem: <T extends AnyTable>(table: T, id: string) => {
    readonly action: "delete";
    readonly table: T;
    readonly id: string;
};
declare const bulkIndexItem: <T extends AnyTable>(table: T, id: string, item: T["schema"]["INPUT"]) => {
    readonly action: "index";
    readonly table: T;
    readonly item: T["schema"]["INPUT"];
    readonly id: string;
};
declare const bulkCreateItem: <T extends AnyTable>(table: T, id: string, item: T["schema"]["INPUT"]) => {
    readonly action: "create";
    readonly table: T;
    readonly item: T["schema"]["INPUT"];
    readonly id: string;
};
declare const bulkUpdateItem: <T extends AnyTable>(table: T, id: string, item: Partial<T["schema"]["INPUT"]>) => {
    readonly action: "update";
    readonly table: T;
    readonly item: Partial<T["schema"]["INPUT"]>;
    readonly id: string;
};
type BulkOptions = {
    items: Array<{
        action: 'create' | 'update' | 'index';
        table: AnyTable;
        id: string;
        item: unknown;
    } | {
        action: 'delete';
        table: AnyTable;
        id: string;
    }>;
    client?: Client;
    refresh?: boolean;
};
declare const bulk: ({ items, client, refresh }: BulkOptions) => Promise<void>;
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

declare const total: <T extends AnyTable>(table: T) => Promise<number>;

type Options$3 = {
    query?: unknown;
    aggs?: unknown;
    limit?: number;
    cursor?: string;
    offset?: number;
    sort?: unknown;
    trackTotalHits?: boolean;
};
type Response<T extends AnyTable> = {
    cursor?: string;
    found: number;
    count: number;
    items: T['schema']['OUTPUT'][];
};
declare const search: <T extends AnyTable>(table: T, { query, aggs, limit, offset, cursor, sort, trackTotalHits }: Options$3) => Promise<Response<T>>;

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

export { type AnySchema, type AnyTable, BulkError, BulkItemError, type Mapping, Schema, type SchemaProps, type Table, VERSION_3_5_0_MIN, type VersionArgs, array, bigfloat, bigint, boolean, bulk, bulkCreateItem, bulkDeleteItem, bulkIndexItem, bulkUpdateItem, createIndex, date, define, deleteIndex, deleteItem, download, indexItem, launch, mockOpenSearch, number, object, search, searchClient, set, string, total, updateItem, uuid };
