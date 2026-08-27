import { Client, ClientOptions, Types } from "@opensearch-project/opensearch";
import { BigFloat, Numeric } from "@awsless/big-float";
//#region src/schema/schema.d.ts
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
//#endregion
//#region src/client.d.ts
declare const searchClient: (options?: ClientOptions, service?: 'es' | 'aoss') => Client;
declare const isServerlessEndpoint: (endpoint?: string) => boolean;
//#endregion
//#region src/server/launch.d.ts
type Settings = Record<string, string | number | boolean>;
type Options$5 = {
  path: string;
  host: string;
  port: number;
  debug?: boolean;
  version: VersionArgs;
  onExit?: (code: number | null, signal: string | null) => void;
  onOutput?: (line: string) => void;
};
declare const launch: ({ path, host, port, version, debug, onExit: onDied, onOutput }: Options$5) => Promise<() => Promise<void>>;
//#endregion
//#region src/server/version.d.ts
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
//#endregion
//#region src/mock.d.ts
type Options$4 = {
  version?: VersionArgs;
  debug?: boolean;
};
declare const mockOpenSearch: ({ version, debug }?: Options$4) => void;
//#endregion
//#region src/server/download.d.ts
declare const download: ({ version }: Pick<VersionArgs, 'version'>) => Promise<string>;
//#endregion
//#region src/table.d.ts
type Table<I extends string, S extends AnySchema> = {
  index: I;
  schema: S;
  client: () => Client;
};
type AnyTable = Table<string, AnySchema>;
declare const define: <I extends string, S extends AnySchema>(index: I, schema: S, client: () => Client) => Table<I, S>;
//#endregion
//#region src/ops/bulk.d.ts
declare const bulkDeleteItem: <T extends AnyTable>(table: T, id: string) => {
  readonly action: 'delete';
  readonly table: T;
  readonly id: string;
};
declare const bulkIndexItem: <T extends AnyTable>(table: T, id: string, item: T['schema']['INPUT']) => {
  readonly action: 'index';
  readonly table: T;
  readonly item: T["schema"]["INPUT"];
  readonly id: string;
};
declare const bulkCreateItem: <T extends AnyTable>(table: T, id: string, item: T['schema']['INPUT']) => {
  readonly action: 'create';
  readonly table: T;
  readonly item: T["schema"]["INPUT"];
  readonly id: string;
};
declare const bulkUpdateItem: <T extends AnyTable>(table: T, id: string, item: Partial<T['schema']['INPUT']>) => {
  readonly action: 'update';
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
//#endregion
//#region src/ops/total.d.ts
declare const total: <T extends AnyTable>(table: T) => Promise<number>;
//#endregion
//#region src/ops/search.d.ts
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
//#endregion
//#region src/ops/index-item.d.ts
type Options$2 = {
  refresh?: boolean;
};
declare const indexItem: <T extends AnyTable>(table: T, id: string, item: T['schema']['INPUT'], { refresh }?: Options$2) => Promise<void>;
//#endregion
//#region src/ops/delete-item.d.ts
type Options$1 = {
  refresh?: boolean;
};
declare const deleteItem: <T extends AnyTable>(table: T, id: string, { refresh }?: Options$1) => Promise<void>;
//#endregion
//#region src/ops/update-item.d.ts
type Options = {
  refresh?: boolean;
};
declare const updateItem: <T extends AnyTable>(table: T, id: string, item: Partial<T['schema']['INPUT']>, { refresh }?: Options) => Promise<void>;
//#endregion
//#region src/ops/create-index.d.ts
declare const createIndex: (table: AnyTable) => Promise<void>;
//#endregion
//#region src/ops/delete-index.d.ts
declare const deleteIndex: (table: AnyTable) => Promise<void>;
//#endregion
//#region src/schema/array.d.ts
declare const array: <S extends AnySchema>(struct: S) => Schema<S["ENCODED"][], S["INPUT"][], S["OUTPUT"][]>;
//#endregion
//#region src/schema/bigfloat.d.ts
declare const bigfloat: (props?: SchemaProps) => Schema<string, Numeric, BigFloat>;
//#endregion
//#region src/schema/bigint.d.ts
declare const bigint: (props?: SchemaProps) => Schema<string, bigint, bigint>;
//#endregion
//#region src/schema/boolean.d.ts
declare const boolean: (props?: SchemaProps) => Schema<boolean, boolean, boolean>;
//#endregion
//#region src/schema/date.d.ts
declare const date: (props?: SchemaProps) => Schema<string, Date, Date>;
//#endregion
//#region src/schema/number.d.ts
declare const number: (props?: SchemaProps) => Schema<string, number, number>;
//#endregion
//#region src/schema/object.d.ts
type Entries = Record<string, AnySchema>;
type InferInput<S extends Entries> = { [K in keyof S]: S[K]['INPUT']; };
type InferOutput<S extends Entries> = { [K in keyof S]: S[K]['OUTPUT']; };
type InferEncoded<S extends Entries> = { [K in keyof S]: S[K]['ENCODED']; };
declare const object: <T extends Entries>(entries: T) => Schema<InferEncoded<T>, InferInput<T>, InferOutput<T>>;
//#endregion
//#region src/schema/set.d.ts
declare const set: <S extends AnySchema>(struct: S) => Schema<S["ENCODED"][], Set<S["INPUT"]>, Set<S["OUTPUT"]>>;
//#endregion
//#region src/schema/string.d.ts
declare const string: <T extends string>(props?: SchemaProps) => Schema<string, T, T>;
//#endregion
//#region src/schema/uuid.d.ts
declare const uuid: (props?: SchemaProps) => Schema<`${string}-${string}-${string}-${string}-${string}`, `${string}-${string}-${string}-${string}-${string}`, `${string}-${string}-${string}-${string}-${string}`>;
//#endregion
export { type AnySchema, type AnyTable, BulkError, BulkItemError, type Mapping, type Schema, type SchemaProps, type Table, type Types, VERSION_3_5_0_MIN, type VersionArgs, array, bigfloat, bigint, boolean, bulk, bulkCreateItem, bulkDeleteItem, bulkIndexItem, bulkUpdateItem, createIndex, date, define, deleteIndex, deleteItem, download, indexItem, isServerlessEndpoint, launch, mockOpenSearch, number, object, search, searchClient, set, string, total, updateItem, uuid };