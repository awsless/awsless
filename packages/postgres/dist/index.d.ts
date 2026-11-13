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
export { type ApplySchemaOptions, type ColumnDefinition, type IndexDefinition, type PostgresClient, type PostgresClientProps, type PostgresDataClientProps, DatabaseError as PostgresError, type SchemaDefinition, type SqlFile, TableChangeError, type TableDefinition, alterTableStatements, applySchema, getSqlState, postgresClient, postgresDataClient };