import { type PostgresQueryBuilder } from '@awsless/postgres';
export { getSqlState, postgres, PostgresError, sql, type PostgresColumn, type PostgresFunction, type PostgresGenerated, type PostgresGeneratedAlways, type PostgresNumeric, type PostgresQueryBuilder, } from '@awsless/postgres';
export declare const getPostgresSchemaName: (stackName: string) => string;
export declare const getPostgresDatabaseName: (appName?: string) => string;
export interface PostgresTables {
}
export type PostgresDatabase<Tables = PostgresTables> = {
    readonly query: <Row = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<Row[]>;
    readonly db: PostgresQueryBuilder<Tables>;
};
export declare const Postgres: PostgresDatabase;
