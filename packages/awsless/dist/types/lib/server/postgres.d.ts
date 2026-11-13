export { getSqlState, PostgresError } from '@awsless/postgres';
export declare const getPostgresSchemaName: (stackName: string) => string;
export declare const getPostgresProps: (stack?: string) => {
    readonly schema: string;
};
export type PostgresDatabase = {
    readonly schema: string;
    readonly query: <Row = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<Row[]>;
};
export interface PostgresResources {
}
export declare const Postgres: PostgresResources;
