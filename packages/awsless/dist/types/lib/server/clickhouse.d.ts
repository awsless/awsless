import { type ClickHouseQueryBuilder } from '@awsless/clickhouse';
export type { ClickHouseColumn, ClickHouseDecimal, ClickHouseGenerated, ClickHouseGeneratedAlways, ClickHouseQueryBuilder, } from '@awsless/clickhouse';
export declare const getClickHouseTableName: (stackName: string, tableName: string) => string;
export declare const getClickHouseStackName: (stackName: string) => string;
export declare const getClickHouseProps: (name: string, stack?: string) => {
    readonly endpoint: string | undefined;
    readonly name: string;
};
export declare const assertMatchingColumns: (label: string, declared: Record<string, string>, defined: Record<string, string>) => void;
export interface ClickHouseResources {
}
export interface ClickHouseTables {
}
export declare const ClickHouse: ClickHouseResources & {
    readonly db: ClickHouseQueryBuilder<ClickHouseTables>;
};
