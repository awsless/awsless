import { DatabaseError } from "pg";
import { RDSDataClient } from "@aws-sdk/client-rds-data";
//#region src/transport.d.ts
type PostgresClient = {
  query<Row = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<Row[]>;
  close(): Promise<void>;
};
declare const getSqlState: (error: unknown) => string | undefined;
//#endregion
//#region src/client.d.ts
type PostgresClientProps = {
  url: string;
  schema?: string;
  max?: number;
  strict?: boolean;
};
declare const postgresClient: (props: PostgresClientProps) => PostgresClient;
//#endregion
//#region src/data-api.d.ts
type PostgresDataClientProps = {
  clusterArn: string;
  secretArn: string;
  database: string;
  client?: RDSDataClient;
  resumeTimeout?: number;
};
declare const postgresDataClient: (props: PostgresDataClientProps) => PostgresClient;
//#endregion
//#region src/function.d.ts
declare const POSTGRES_FUNCTION: unique symbol;
type PostgresType<T> = {
  sql: string;
  encode?(value: T): unknown;
  shape: 'value' | 'rows' | 'nothing';
  readonly __value?: T;
};
type Columns = Record<string, PostgresType<unknown>>;
type ValueOf<Type> = Type extends PostgresType<infer T> ? T : never;
type RowOf<C extends Columns> = { [Name in keyof C]: ValueOf<C[Name]>; };
declare const uuid: <T extends string = `${string}-${string}-${string}-${string}-${string}`>() => PostgresType<T>;
declare const text: <T extends string = string>() => PostgresType<T>;
declare const integer: () => PostgresType<number>;
declare const double: () => PostgresType<number>;
declare const boolean: () => PostgresType<boolean>;
declare const date: () => PostgresType<string>;
declare const timestamp: () => PostgresType<Date>;
declare const jsonb: <T = unknown>() => PostgresType<T>;
declare const array: <T>(item: PostgresType<T>) => PostgresType<T[]>;
declare const nullable: <T>(type: PostgresType<T>) => PostgresType<T | null>;
declare const custom: <T = unknown>(sql: string) => PostgresType<T>;
declare const table: <C extends Columns>(columns: C) => PostgresType<RowOf<C>[]>;
declare const nothing: () => PostgresType<void>;
type FunctionDefinition<A extends Columns, R> = {
  name: string;
  args: A;
  returns: PostgresType<R>;
  language: 'sql' | 'plpgsql';
  attributes?: string;
  body: string;
};
type Queryable = Pick<PostgresClient, 'query'>;
type CallArgs<A extends Columns> = keyof A extends never ? [] : [args: RowOf<A>];
type PostgresFunction<A extends Columns = Columns, R = unknown> = {
  (client: Queryable, ...args: CallArgs<A>): Promise<R>;
  functionName: string;
  sql: string;
  [POSTGRES_FUNCTION]: true;
};
declare const define: <A extends Columns, R>(definition: FunctionDefinition<A, R>) => PostgresFunction<A, R>;
declare const isPostgresFunction: (value: unknown) => value is PostgresFunction;
declare const postgres: {
  function: {
    define: typeof define;
  };
  type: {
    uuid: typeof uuid;
    text: typeof text;
    integer: typeof integer;
    double: typeof double;
    boolean: typeof boolean;
    date: typeof date;
    timestamp: typeof timestamp;
    jsonb: typeof jsonb;
    array: typeof array;
    nullable: typeof nullable;
    custom: typeof custom;
    table: typeof table;
    nothing: typeof nothing;
  };
};
//#endregion
//#region src/table.d.ts
type ColumnDefinition = string | {
  type: string;
  default?: string;
  collate?: string;
  identity?: boolean;
};
type IndexDefinition = string[] | {
  columns: string[];
  unique?: boolean;
};
type TableDefinition = {
  columns: Record<string, ColumnDefinition>;
  primaryKey: string[];
  indexes?: Record<string, IndexDefinition>;
  partitionBy?: {
    hash: string[];
    partitions: number;
  };
  fillfactor?: number;
};
declare class TableChangeError extends Error {
  constructor(message: string);
}
declare const alterTableStatements: (name: string, prior: TableDefinition, next: TableDefinition) => string[];
//#endregion
//#region src/schema.d.ts
type SqlFile = {
  name: string;
  sql: string;
};
type SchemaDefinition = {
  schema: string;
  tables?: Record<string, TableDefinition>;
  functions?: SqlFile[];
};
type ApplySchemaOptions = {
  reset?: boolean;
  recreate?: boolean;
  retain?: boolean;
};
declare const applySchema: (client: PostgresClient, definition: SchemaDefinition, options?: ApplySchemaOptions) => Promise<void>;
//#endregion
export { type ApplySchemaOptions, type ColumnDefinition, type IndexDefinition, type PostgresClient, type PostgresClientProps, type PostgresDataClientProps, DatabaseError as PostgresError, type PostgresFunction, type PostgresType, type SchemaDefinition, type SqlFile, TableChangeError, type TableDefinition, alterTableStatements, applySchema, getSqlState, isPostgresFunction, postgres, postgresClient, postgresDataClient };