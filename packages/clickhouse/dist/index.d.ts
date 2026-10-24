import { BaseQueryParams, ClickHouseError, ClickHouseSettings } from "@clickhouse/client";
//#region src/schema/schema.d.ts
type AnySchema = Schema<any, any, any>;
declare class Schema<Encoded, Input, Output> {
  readonly encode: (value: Input) => Encoded;
  readonly decode: (value: Encoded) => Output;
  readonly type: string;
  readonly ENCODED: Encoded;
  readonly INPUT: Input;
  readonly OUTPUT: Output;
  constructor(encode: (value: Input) => Encoded, decode: (value: Encoded) => Output, type: string);
}
//#endregion
//#region src/schema/object.d.ts
type Entries = Record<string, AnySchema>;
type OptionalKeys<S extends Entries> = { [K in keyof S]: S[K] extends {
  OPTIONAL: true;
} ? K : never; }[keyof S];
type InferInput<S extends Entries> = { [K in Exclude<keyof S, OptionalKeys<S>>]: S[K]['INPUT']; } & { [K in OptionalKeys<S>]?: S[K]['INPUT']; };
type InferOutput<S extends Entries> = { [K in keyof S]: S[K]['OUTPUT']; };
type InferEncoded<S extends Entries> = { [K in keyof S]: S[K]['ENCODED']; };
declare class ObjectSchema<T extends Entries> extends Schema<InferEncoded<T>, InferInput<T>, InferOutput<T>> {
  readonly entries: T;
  readonly columns: Record<string, string>;
  constructor(entries: T);
}
type AnyObjectSchema = ObjectSchema<any>;
declare const object: <T extends Entries>(entries: T) => ObjectSchema<T>;
//#endregion
//#region src/client.d.ts
type Settings = ClickHouseSettings;
type QueryParams = NonNullable<BaseQueryParams['query_params']>;
type ClickHouseClientProps = {
  endpoint: string;
  username?: string;
  password?: string | (() => Promise<string>);
  database?: string;
  settings?: Settings;
  requestTimeout?: number;
};
type InsertOptions = {
  async?: boolean;
  settings?: Settings;
};
type ClickHouseClient = ReturnType<typeof clickhouseClient>;
declare const clickhouseClient: (props: ClickHouseClientProps) => {
  query<T = Record<string, unknown>>(sql: string, params?: QueryParams, settings?: Settings): Promise<T[]>;
  command(sql: string, params?: QueryParams, settings?: Settings): Promise<void>;
  insert<T extends Record<string, unknown>>(table: string, rows: T[], options?: InsertOptions): Promise<void>;
  close(): Promise<void>;
};
//#endregion
//#region src/param.d.ts
declare const quoteIdentifier: (name: string) => string;
declare const quoteString: (value: string) => string;
//#endregion
//#region src/ddl.d.ts
type ColumnDefinition = string | {
  type: string;
  default?: string;
  materialized?: string;
  codec?: string;
  comment?: string;
};
type IndexDefinition = {
  expression: string;
  type: string;
  granularity?: number;
};
type TableDefinition = {
  columns: Record<string, ColumnDefinition>;
  engine?: string;
  orderBy?: string[];
  partitionBy?: string;
  primaryKey?: string[];
  ttl?: string;
  indexes?: Record<string, IndexDefinition>;
  settings?: Record<string, string | number | boolean>;
  comment?: string;
};
type Column = Exclude<ColumnDefinition, string>;
declare const columnOf: (column: ColumnDefinition) => Column;
declare const formatSetting: (value: string | number | boolean) => string;
declare const formatColumn: (name: string, definition: ColumnDefinition) => string;
declare const formatIndex: (name: string, index: IndexDefinition) => string;
declare const createTableStatement: (name: string, table: TableDefinition) => string;
declare const dropTable$1: (client: ClickHouseClient, name: string) => Promise<void>;
//#endregion
//#region src/table.d.ts
type Table<N extends string, S extends AnyObjectSchema> = {
  name: N;
  schema: S;
  client: () => ClickHouseClient;
};
type AnyTable = Table<string, AnyObjectSchema>;
declare const define: <N extends string, S extends AnyObjectSchema>(name: N, schema: S, client: () => ClickHouseClient) => Table<N, S>;
//#endregion
//#region src/ops/insert.d.ts
declare const insert: <T extends AnyTable>(table: T, rows: T['schema']['INPUT'][], options?: InsertOptions) => Promise<void>;
//#endregion
//#region src/ops/query.d.ts
declare const query: <R = Record<string, unknown>>(table: AnyTable, sql: string, params?: QueryParams, settings?: Settings) => Promise<R[]>;
//#endregion
//#region src/ops/select.d.ts
type Options$2 = {
  where?: string;
  params?: QueryParams;
  orderBy?: string;
  limit?: number;
  offset?: number;
  final?: boolean;
};
declare const select: <T extends AnyTable>(table: T, { where, params, orderBy, limit, offset, final }?: Options$2) => Promise<T['schema']['OUTPUT'][]>;
//#endregion
//#region src/ops/count.d.ts
type Options$1 = {
  where?: string;
  params?: QueryParams;
  final?: boolean;
};
declare const count: (table: AnyTable, { where, params, final }?: Options$1) => Promise<number>;
//#endregion
//#region src/ops/delete-rows.d.ts
type Options = {
  where: string;
  params?: QueryParams;
};
declare const deleteRows: (table: AnyTable, { where, params }: Options) => Promise<void>;
//#endregion
//#region src/ops/create-table.d.ts
declare const createTable: (table: AnyTable, definition?: Omit<TableDefinition, 'columns'>) => Promise<void>;
//#endregion
//#region src/ops/drop-table.d.ts
declare const dropTable: (table: AnyTable) => Promise<void>;
//#endregion
//#region src/schema/array.d.ts
declare const array: <S extends AnySchema>(schema: S) => Schema<S["ENCODED"][], S["INPUT"][], S["OUTPUT"][]>;
//#endregion
//#region src/schema/boolean.d.ts
declare const boolean: () => Schema<boolean, boolean, boolean>;
//#endregion
//#region src/schema/date.d.ts
type DateProps = {
  precision?: number;
  timeZone?: string;
};
declare const date: ({ precision, timeZone }?: DateProps) => Schema<string, Date, Date>;
//#endregion
//#region src/schema/enums.d.ts
declare const enums: <const T extends string>(values: readonly T[]) => Schema<T, T, T>;
//#endregion
//#region src/schema/json.d.ts
declare const json: <T extends Record<string, unknown>>() => Schema<T, T, T>;
//#endregion
//#region src/schema/map.d.ts
declare const map: <S extends AnySchema>(schema: S) => Schema<Record<string, S["ENCODED"]>, Record<string, S["INPUT"]>, Record<string, S["OUTPUT"]>>;
//#endregion
//#region src/schema/nullable.d.ts
declare const nullable: <S extends AnySchema>(schema: S) => Schema<S["ENCODED"] | null, S["INPUT"] | null, S["OUTPUT"] | null>;
//#endregion
//#region src/schema/optional.d.ts
declare class OptionalSchema<S extends AnySchema> extends Schema<S['ENCODED'], S['INPUT'], S['OUTPUT']> {
  readonly inner: S;
  readonly OPTIONAL: true;
  constructor(inner: S);
}
declare const optional: <S extends AnySchema>(schema: S) => OptionalSchema<S>;
//#endregion
//#region src/schema/number.d.ts
type NumberType = 'Float64' | 'Float32' | 'Int8' | 'Int16' | 'Int32' | 'Int64' | 'UInt8' | 'UInt16' | 'UInt32' | 'UInt64';
declare const number: <T extends number = number>(type?: NumberType) => Schema<number, T, T>;
//#endregion
//#region src/schema/string.d.ts
type StringProps = {
  lowCardinality?: boolean;
};
declare const string: <T extends string = string>(props?: StringProps) => Schema<string, T, T>;
//#endregion
//#region src/schema/uuid.d.ts
declare const uuid: () => Schema<string, `${string}-${string}-${string}-${string}-${string}`, `${string}-${string}-${string}-${string}-${string}`>;
//#endregion
export { type AnyObjectSchema, type AnySchema, type AnyTable, type ClickHouseClient, type ClickHouseClientProps, ClickHouseError, type Column, type ColumnDefinition, type IndexDefinition, type InsertOptions, type ObjectSchema, type QueryParams, type Schema, type Settings, type Table, type TableDefinition, array, boolean, clickhouseClient, columnOf, count, createTable, createTableStatement, date, define, deleteRows, dropTable, dropTable$1 as dropTableByName, enums, formatColumn, formatIndex, formatSetting, insert, json, map, nullable, number, object, optional, query, quoteIdentifier, quoteString, select, string, uuid };