import { GenericMapSchema } from '@awsless/dynamodb';
export declare const getTableName: <N extends string, S extends string = string>(resourceName: N, stackName?: S) => `${string}--${S}--table--${N}`;
type TableKeys = {
    hash: string;
    sort?: string;
    indexes?: Record<string, {
        hash: string | string[];
        sort?: string | string[];
    }>;
};
export declare const getTableProps: (name: string, stack?: string) => {
    readonly name: `${string}--${string}--table--${string}`;
    readonly keys: TableKeys | undefined;
};
export declare const assertKeyAttributes: (label: string, keys: TableKeys, schema: GenericMapSchema) => void;
export interface TableResources {
}
export declare const Table: TableResources;
export {};
