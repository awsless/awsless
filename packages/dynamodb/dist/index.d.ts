import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { NativeAttributeValue } from '@aws-sdk/util-dynamodb';
import { CreateTableCommandInput, DynamoDBClient } from '@aws-sdk/client-dynamodb';
export { ConditionalCheckFailedException, TransactionCanceledException } from '@aws-sdk/client-dynamodb';
import { DynamoDBServer } from '@awsless/dynamodb-server';

declare class Table<Model extends Item, HashKey extends keyof Model, SortKey extends keyof Model = never> {
    readonly name: string;
    model: Model;
    hashKey: HashKey;
    sortKey: SortKey;
    key: Pick<Model, HashKey | SortKey>;
    constructor(name: string);
    toString(): string;
}

interface Options {
    client?: DynamoDBDocumentClient;
}
type ReturnValues = 'NONE' | 'ALL_OLD' | 'UPDATED_OLD' | 'ALL_NEW' | 'UPDATED_NEW';
interface MutateOptions extends Options {
    condition?: ExpressionBuilder;
    return?: ReturnValues;
}
type Name = string;
type Value = NativeAttributeValue;
type Item = Record<Name, Value>;
type IDGenerator = () => number;
type BaseTable = Table<Item, keyof Item, keyof Item>;
type ExpressionNames = Record<string, Name>;
type ExpressionValues = Record<string, Value>;
type ExpressionBuilder = (gen: IDGenerator, table: Table<Item, keyof Item, keyof Item>) => Expression;
type Expression<Names extends ExpressionNames = ExpressionNames, Values extends ExpressionValues = ExpressionValues> = {
    readonly query: string;
    readonly names: Names;
    readonly values: Values;
};

declare const ql: (literals: TemplateStringsArray, ...raw: Value[]) => ExpressionBuilder;

interface GetOptions extends Options {
    consistentRead?: boolean;
    projection?: ExpressionBuilder;
}
declare const getItem: <T extends BaseTable>(table: T, key: T["key"], options?: GetOptions) => Promise<T["model"] | undefined>;

type PutOptions$1 = MutateOptions;
declare const putItem: <T extends BaseTable>(table: T, item: T["model"], options?: PutOptions$1) => Promise<T["model"] | undefined>;

interface UpdateOptions$1 extends MutateOptions {
    update: ExpressionBuilder;
}
declare const updateItem: <T extends BaseTable>(table: T, key: T["key"], options: UpdateOptions$1) => Promise<T["model"] | undefined>;

type DeleteOptions$1 = MutateOptions;
declare const deleteItem: <T extends BaseTable>(table: T, key: T["key"], options?: DeleteOptions$1) => Promise<T["model"] | undefined>;

interface BatchGetOptions<F extends boolean> extends Options {
    projection?: ExpressionBuilder;
    consistentRead?: boolean;
    filterNonExistentItems?: F;
}
type BatchGetItem = {
    <T extends BaseTable>(table: T, keys: T['key'][], options?: BatchGetOptions<false>): Promise<(T['model'] | undefined)[]>;
    <T extends BaseTable>(table: T, keys: T['key'][], options?: BatchGetOptions<true>): Promise<T['model'][]>;
};
declare const batchGetItem: BatchGetItem;

interface PaginationOptions extends Options {
    keyCondition: ExpressionBuilder;
    projection?: ExpressionBuilder;
    index?: string;
    consistentRead?: boolean;
    limit?: number;
    forward?: boolean;
    cursor?: string;
}
interface PaginationResponse<T extends BaseTable> {
    count: number;
    items: T['model'][];
    cursor?: string;
}
declare const pagination: <T extends BaseTable>(table: T, options: PaginationOptions) => Promise<PaginationResponse<T>>;

interface QueryOptions<T extends BaseTable> extends Options {
    keyCondition: ExpressionBuilder;
    projection?: ExpressionBuilder;
    index?: string;
    consistentRead?: boolean;
    limit?: number;
    forward?: boolean;
    cursor?: T['key'];
}
interface QueryResponse<T extends BaseTable> {
    count: number;
    items: T['model'][];
    cursor?: T['key'];
}
declare const query: <T extends BaseTable>(table: T, options: QueryOptions<T>) => Promise<QueryResponse<T>>;

interface ScanOptions<T extends Table<Item, keyof Item, keyof Item>> extends Options {
    projection?: ExpressionBuilder;
    index?: string;
    consistentRead?: boolean;
    limit?: number;
    cursor?: T['key'];
}
interface ScanResponse<T extends Table<Item, keyof Item, keyof Item>> {
    count: number;
    items: T['model'][];
    cursor?: T['key'];
}
declare const scan: <T extends Table<Item, string, string>>(table: T, options?: ScanOptions<T>) => Promise<ScanResponse<T>>;

interface TransactWriteOptions extends Options {
    idempotantKey?: string;
    items: Transactable<BaseTable>[];
}
type Transactable<T extends BaseTable> = ConditionCheck<T> | Put<T> | Update<T> | Delete<T>;
interface Command {
    TableName: string;
    ConditionExpression?: string;
    ExpressionAttributeNames?: {
        [key: string]: string;
    };
    ExpressionAttributeValues?: {
        [key: string]: Value;
    };
}
interface ConditionCheck<T extends BaseTable> {
    ConditionCheck: Command & {
        Key: T['key'];
        ConditionExpression: string;
    };
}
interface Put<T extends BaseTable> {
    Put: Command & {
        Item: T['model'];
    };
}
interface Update<T extends BaseTable> {
    Update: Command & {
        Key: T['key'];
        UpdateExpression: string;
    };
}
interface Delete<T extends BaseTable> {
    Delete: Command & {
        Key: T['key'];
    };
}
declare const transactWrite: (options: TransactWriteOptions) => Promise<void>;
interface ConditionCheckOptions {
    condition: ExpressionBuilder;
}
declare const transactConditionCheck: <T extends BaseTable>(table: T, key: T["key"], options: ConditionCheckOptions) => ConditionCheck<T>;
interface PutOptions {
    condition?: ExpressionBuilder;
}
declare const transactPut: <T extends BaseTable>(table: T, item: T["model"], options?: PutOptions) => Put<T>;
interface UpdateOptions {
    update: ExpressionBuilder;
    condition?: ExpressionBuilder;
}
declare const transactUpdate: <T extends BaseTable>(table: T, key: T["key"], options: UpdateOptions) => Update<T>;
interface DeleteOptions {
    condition?: ExpressionBuilder;
}
declare const transactDelete: <T extends BaseTable>(table: T, key: T["key"], options?: DeleteOptions) => Delete<T>;

interface MigrateOptions<Old extends Item, New extends Item> extends Options {
    consistentRead?: boolean;
    batch?: number;
    transform: TransformCallback<Old, New>;
}
interface TransformCallback<Old extends Item, New extends Item> {
    (item: Old): New | Promise<New>;
}
interface MigrateResponse {
    itemsProcessed: number;
}
declare const migrate: <From extends BaseTable, To extends BaseTable>(from: From, to: To, options: MigrateOptions<From["model"], To["model"]>) => Promise<MigrateResponse>;

type SeedData = {
    [key: string]: object[];
};

interface StartDynamoDBOptions {
    tables: CreateTableCommandInput | CreateTableCommandInput[];
    timeout?: number;
    seed?: SeedData;
}
declare const mockDynamoDB: (configOrServer: StartDynamoDBOptions | DynamoDBServer) => DynamoDBServer;

declare const dynamoDBClient: {
    (): DynamoDBClient;
    set(client: DynamoDBClient): void;
};
declare const dynamoDBDocumentClient: {
    (): DynamoDBDocumentClient;
    set(client: DynamoDBDocumentClient): void;
};

export { BatchGetOptions, DeleteOptions$1 as DeleteOptions, Expression, ExpressionNames, ExpressionValues, GetOptions, Item, PaginationOptions, PutOptions$1 as PutOptions, QueryOptions, ScanOptions, Table, UpdateOptions$1 as UpdateOptions, Value, batchGetItem, deleteItem, dynamoDBClient, dynamoDBDocumentClient, getItem, migrate, mockDynamoDB, pagination, putItem, ql, query, scan, transactConditionCheck, transactDelete, transactPut, transactUpdate, transactWrite, updateItem };
