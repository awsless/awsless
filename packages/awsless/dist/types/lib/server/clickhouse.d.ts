export declare const formatClickHouseTableName: (stackName: string, tableName: string) => string;
export declare const getClickHouseProps: (name: string, stack?: string) => {
    readonly endpoint: string | undefined;
    readonly name: string;
};
export declare const assertMatchingColumns: (label: string, declared: Record<string, string>, defined: Record<string, string>) => void;
export interface ClickHouseResources {
}
export declare const ClickHouse: ClickHouseResources;
