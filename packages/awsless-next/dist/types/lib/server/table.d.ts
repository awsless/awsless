export declare const getTableName: <N extends string, S extends string = "stack">(resourceName: N, stackName?: S) => `app--${S}--table--${N}`;
type TableKeys = {
    hash: string;
    sort?: string;
    indexes?: Record<string, {
        hash: string | string[];
        sort?: string | string[];
    }>;
};
export declare const getTableProps: (name: string, stack?: string) => {
    readonly name: `app--${string}--table--${string}`;
    readonly keys: TableKeys | undefined;
};
export interface TableResources {
}
export declare const Table: TableResources;
export {};
