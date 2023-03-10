import { Numeric, BigFloat } from '@awsless/big-float';
import { CreateTableCommandInput, DynamoDBClient, AttributeValue } from '@aws-sdk/client-dynamodb';
export { ConditionalCheckFailedException, TransactionCanceledException } from '@aws-sdk/client-dynamodb';
import { DynamoDBServer } from '@awsless/dynamodb-server';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

type AttributeTypes = 'S' | 'N' | 'B' | 'BOOL' | 'L' | 'M' | 'SS' | 'NS' | 'BS';
type AnyStruct = Struct<any, any, any, Array<string | number>, Array<string | number>, AttributeTypes, boolean>;
declare class Struct<Marshalled, Input, Output, Paths extends Array<string | number> = [], OptionalPaths extends Array<string | number> = [], Type extends AttributeTypes = AttributeTypes, Optional extends boolean = false> {
    readonly type: Type;
    readonly _marshall: (value: Input) => Marshalled;
    readonly _unmarshall: (value: Marshalled) => Output;
    readonly walk: undefined | ((...path: Array<string | number>) => AnyStruct | undefined);
    readonly optional: Optional;
    readonly MARSHALLED: Marshalled;
    readonly INPUT: Input;
    readonly OUTPUT: Output;
    readonly PATHS: Paths;
    readonly OPT_PATHS: OptionalPaths;
    constructor(type: Type, _marshall: (value: Input) => Marshalled, _unmarshall: (value: Marshalled) => Output, walk?: undefined | ((...path: Array<string | number>) => AnyStruct | undefined), optional?: Optional);
    marshall(value: Input): Record<Type, Marshalled>;
    unmarshall(value: Record<Type, Marshalled>): Output;
}

type AnyTableDefinition = TableDefinition<AnyStruct, Extract<keyof AnyStruct['INPUT'], string>, Extract<keyof AnyStruct['INPUT'], string> | undefined, any>;
type IndexNames<T extends AnyTableDefinition> = Extract<keyof T['indexes'], string>;
type TableIndex<Struct extends AnyStruct> = {
    hash: Extract<keyof Struct['INPUT'], string>;
    sort?: Extract<keyof Struct['INPUT'], string> | undefined;
};
type TableIndexes<Struct extends AnyStruct> = Record<string, TableIndex<Struct>>;
declare class TableDefinition<Struct extends AnyStruct, Hash extends Extract<keyof Struct['INPUT'], string>, Sort extends Extract<keyof Struct['INPUT'], string> | undefined, Indexes extends TableIndexes<Struct> | undefined> {
    readonly name: string;
    readonly hash: Hash;
    readonly sort: Sort;
    readonly schema: Struct;
    readonly indexes: Indexes;
    constructor(name: string, opt: {
        hash: Hash;
        sort?: Sort;
        schema: Struct;
        indexes?: Indexes;
    });
    marshall(item: Partial<Struct['INPUT']>): Struct['MARSHALLED'][string];
    unmarshall(item: Struct['MARSHALLED'][string]): Struct['OUTPUT'];
}
declare const define: <Struct extends AnyStruct, Hash extends Extract<keyof Struct["INPUT"], string>, Sort extends Extract<keyof Struct["INPUT"], string> | undefined, Indexes extends TableIndexes<Struct> | undefined>(name: string, options: {
    hash: Hash;
    sort?: Sort | undefined;
    schema: Struct;
    indexes?: Indexes | undefined;
}) => TableDefinition<Struct, Hash, Sort, Indexes>;

declare const optional: <M, I, O, P extends (string | number)[] = [], OP extends (string | number)[] = [], T extends AttributeTypes = AttributeTypes>(struct: Struct<M, I, O, P, OP, T, false>) => Struct<M, I, O, P, OP, T, true>;

declare const string: () => Struct<string, string, string, [], [], AttributeTypes, false>;

declare const boolean: () => Struct<boolean, boolean, boolean, [], [], AttributeTypes, false>;

declare const number: () => Struct<string, number, number, [], [], AttributeTypes, false>;

declare const bigint: () => Struct<string, bigint, bigint, [], [], AttributeTypes, false>;

declare const bigfloat: () => Struct<string, Numeric, BigFloat, [], [], AttributeTypes, false>;

type BinaryValue = ArrayBuffer | Blob | Buffer | DataView | File | Int8Array | Uint8Array | Uint8ClampedArray | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array | Float64Array | BigInt64Array | BigUint64Array;

declare const binary: <T extends BinaryValue>() => Struct<T, T, T, [], [], AttributeTypes, false>;

type Schema = Record<string, AnyStruct>;
type KeyOf<S> = Extract<keyof S, string>;
type FilterOptional<S extends Schema> = {
    [K in KeyOf<S> as S[K]['optional'] extends true ? K : never]?: S[K];
};
type FilterRequired<S extends Schema> = {
    [K in KeyOf<S> as S[K]['optional'] extends true ? never : K]: S[K];
};
type Optinalize<S extends Schema> = FilterOptional<S> & FilterRequired<S>;
type InferInput<S extends Schema> = {
    [K in keyof Optinalize<S>]: S[K]['INPUT'];
};
type InferOutput<S extends Schema> = {
    [K in keyof Optinalize<S>]: S[K]['OUTPUT'];
};
type InferMarshalled<S extends Schema> = {
    [K in keyof Optinalize<S>]: S[K]['MARSHALLED'];
};
type InferPaths<S extends Schema> = {
    [K in KeyOf<S>]: [K] | [K, ...S[K]['PATHS']];
}[KeyOf<S>];
type InferOptPaths<S extends Schema> = {
    [K in KeyOf<S>]: S[K]['optional'] extends true ? [K] | [K, ...S[K]['OPT_PATHS']] : [];
}[KeyOf<S>];
declare const object: <S extends Schema>(schema: S) => Struct<InferMarshalled<S>, InferInput<S>, InferOutput<S>, InferPaths<S>, InferOptPaths<S>, AttributeTypes, false>;

type ArrayPaths<L extends AnyStruct> = [number] | [number, ...L['PATHS']];
type ArrayOptPaths<L extends AnyStruct> = [number] | [number, ...L['OPT_PATHS']];
declare const array: <S extends AnyStruct>(struct: S) => Struct<S["MARSHALLED"][], S["INPUT"][], S["OUTPUT"][], ArrayPaths<S>, ArrayOptPaths<S>, AttributeTypes, false>;

declare const stringSet: () => Struct<string[], Set<string>, Set<string>, [], [], AttributeTypes, false>;

declare const numberSet: () => Struct<string[], Set<number>, Set<number>, [], [], AttributeTypes, false>;

declare const bigintSet: () => Struct<string[], Set<bigint>, Set<bigint>, [], [], AttributeTypes, false>;

declare const binarySet: <T extends BinaryValue>() => Struct<T[], Set<T>, Set<T>, [], [], AttributeTypes, false>;

type SeedData = {
    [key: string]: object[];
};

interface StartDynamoDBOptions {
    tables: CreateTableCommandInput | CreateTableCommandInput[] | AnyTableDefinition | AnyTableDefinition[];
    timeout?: number;
    seed?: SeedData;
}
declare const mockDynamoDB: (configOrServer: StartDynamoDBOptions | DynamoDBServer) => DynamoDBServer;

type WalkPath<Object, Path extends Array<unknown>> = (Path extends [infer Key extends keyof Object, ...infer Rest] ? WalkPath<Object[Key], Rest> : Object);
type InferPath<T extends AnyTableDefinition> = T['schema']['PATHS'];
type InferValue$1<T extends AnyTableDefinition, P extends T['schema']['PATHS']> = WalkPath<T['schema']['INPUT'], P>;

type InferSetType<T extends AnyTableDefinition, P extends InferPath<T>> = (Parameters<InferValue$1<T, P>['add']>[0]);
type Condition<T extends AnyTableDefinition> = Readonly<{
    where: <P extends InferPath<T>>(...path: P) => Where$1<T, P>;
}>;
type Where$1<T extends AnyTableDefinition, P extends InferPath<T>> = Readonly<{
    not: Where$1<T, P>;
    eq: (value: InferValue$1<T, P>) => Combiner$1<T>;
    nq: (value: InferValue$1<T, P>) => Combiner$1<T>;
    gt: (value: InferValue$1<T, P>) => Combiner$1<T>;
    gte: (value: InferValue$1<T, P>) => Combiner$1<T>;
    lt: (value: InferValue$1<T, P>) => Combiner$1<T>;
    lte: (value: InferValue$1<T, P>) => Combiner$1<T>;
    between: (min: InferValue$1<T, P>, max: InferValue$1<T, P>) => Combiner$1<T>;
    in: (values: InferValue$1<T, P>[]) => Combiner$1<T>;
    exists: Combiner$1<T>;
    attributeType: (value: AttributeTypes) => Combiner$1<T>;
    beginsWith: (value: InferValue$1<T, P>) => Combiner$1<T>;
    contains: (value: InferSetType<T, P>) => Combiner$1<T>;
    size: Size<T>;
}>;
type Size<T extends AnyTableDefinition> = Readonly<{
    eq: (value: number | bigint) => Combiner$1<T>;
    nq: (value: number | bigint) => Combiner$1<T>;
    gt: (value: number | bigint) => Combiner$1<T>;
    gte: (value: number | bigint) => Combiner$1<T>;
    lt: (value: number | bigint) => Combiner$1<T>;
    lte: (value: number | bigint) => Combiner$1<T>;
    between: (min: number | bigint, max: number | bigint) => Combiner$1<T>;
}>;
type Combiner$1<T extends AnyTableDefinition> = Readonly<{
    and: Condition<T>;
    or: Condition<T>;
}>;

type ReturnValues = 'NONE' | 'ALL_OLD' | 'UPDATED_OLD' | 'ALL_NEW' | 'UPDATED_NEW';
type LimitedReturnValues = 'NONE' | 'ALL_OLD';
type ReturnResponse<T extends AnyTableDefinition, R extends ReturnValues | LimitedReturnValues = 'NONE'> = (R extends 'NONE' ? void : R extends 'ALL_NEW' | 'ALL_OLD' ? T['schema']['OUTPUT'] | undefined : Partial<T['schema']['OUTPUT']> | undefined);

interface Options {
    client?: DynamoDBClient;
}
interface MutateOptions<T extends AnyTableDefinition, R extends ReturnValues = 'NONE'> extends Options {
    condition?: (exp: Condition<T>) => void;
    return?: R;
}

declare const dynamoDBClient: {
    (): DynamoDBClient;
    set(client: DynamoDBClient): void;
};
declare const dynamoDBDocumentClient: {
    (): DynamoDBDocumentClient;
    set(client: DynamoDBDocumentClient): void;
};

type DeepPick<O, P> = (P extends keyof O ? {
    [_ in P]: O[P];
} : P extends [infer K] ? K extends keyof O ? {
    [_ in K]: O[K];
} : never : P extends [infer K, ...infer R] ? K extends keyof O ? {
    [_ in K]: DeepPick<O[K], R>;
} : never : never);
type DeepPickList<O, P extends unknown[]> = {
    [K in keyof P]: DeepPick<O, P[K]>;
}[number];
type Merge<U> = ((U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never);
type ProjectionExpression<T extends AnyTableDefinition> = Array<T['schema']['PATHS'] | Exclude<T['schema']['PATHS'][number], number>>;
type ProjectionResponse<T extends AnyTableDefinition, P extends ProjectionExpression<T> | undefined> = (P extends ProjectionExpression<T> ? Merge<DeepPickList<T['schema']['OUTPUT'], P>> : T['schema']['OUTPUT']);

type Key<T extends AnyTableDefinition, K extends keyof T['schema']['INPUT']> = Required<Record<K, T['schema']['INPUT'][K]>>;
type HashKey<T extends AnyTableDefinition, I extends IndexNames<T> | undefined = undefined> = (I extends IndexNames<T> ? Key<T, T['indexes'][I]['hash']> : Key<T, T['hash']>);
type SortKey<T extends AnyTableDefinition, I extends IndexNames<T> | undefined = undefined> = (I extends IndexNames<T> ? T['indexes'][I]['sort'] extends string ? Key<T, T['indexes'][I]['sort']> : {} : T['sort'] extends string ? Key<T, T['sort']> : {});
type PrimaryKey<T extends AnyTableDefinition, I extends IndexNames<T> | undefined = undefined> = HashKey<T, I> & SortKey<T, I>;
type CursorKey<T extends AnyTableDefinition, I extends IndexNames<T> | undefined = undefined> = PrimaryKey<T> & (I extends IndexNames<T> ? PrimaryKey<T, I> : {});

declare const getItem: <T extends AnyTableDefinition, P extends ProjectionExpression<T> | undefined = undefined>(table: T, key: PrimaryKey<T, undefined>, options?: Options & {
    consistentRead?: boolean | undefined;
    projection?: P | undefined;
}) => Promise<ProjectionResponse<T, P> | undefined>;

declare const putItem: <T extends AnyTableDefinition, R extends LimitedReturnValues = "NONE">(table: T, item: T["schema"]["INPUT"], options?: MutateOptions<T, R>) => Promise<ReturnResponse<T, R>>;

type UpdateExpression<T extends AnyTableDefinition> = Readonly<{
    /** Define a custom update expression */
    raw: (fn: (path: <P extends InferPath<T>>(...path: P) => string, value: (value: Record<AttributeTypes, any>) => string) => string) => void;
    /** Update a given property */
    update: <P extends InferPath<T>>(...path: P) => Update$1<T, P>;
}>;
type Update$1<T extends AnyTableDefinition, P extends InferPath<T>> = Readonly<{
    /** Set a value */
    set: (value: InferValue$1<T, P>) => UpdateExpression<T>;
    /** Delete a property */
    del: () => UpdateExpression<T>;
    /** Increment a numeric value */
    incr: (value?: number | bigint | BigFloat, initialValue?: number | bigint | BigFloat) => UpdateExpression<T>;
    /** Decrement a numeric value */
    decr: (value?: number | bigint | BigFloat, initialValue?: number | bigint | BigFloat) => UpdateExpression<T>;
    /** Append values to a Set */
    append: (values: InferValue$1<T, P>) => UpdateExpression<T>;
    /** Remove values from a Set */
    remove: (values: InferValue$1<T, P>) => UpdateExpression<T>;
}>;

type UpdateOptions$1<T extends AnyTableDefinition, R extends ReturnValues = 'NONE'> = MutateOptions<T, R> & {
    update: (exp: UpdateExpression<T>) => void;
};
declare const updateItem: <T extends AnyTableDefinition, R extends ReturnValues = "NONE">(table: T, key: PrimaryKey<T, undefined>, options: UpdateOptions$1<T, R>) => Promise<ReturnResponse<T, R>>;

declare const deleteItem: <T extends AnyTableDefinition, R extends LimitedReturnValues = "NONE">(table: T, key: PrimaryKey<T, undefined>, options?: MutateOptions<T, R>) => Promise<ReturnResponse<T, R>>;

type BatchGetOptions<T extends AnyTableDefinition, P extends ProjectionExpression<T> | undefined, F extends boolean> = Options & {
    projection?: P;
    consistentRead?: boolean;
    filterNonExistentItems?: F;
};
type BatchGetItem = {
    <T extends AnyTableDefinition, P extends ProjectionExpression<T> | undefined>(table: T, keys: PrimaryKey<T>[], options?: BatchGetOptions<T, P, false>): Promise<(ProjectionResponse<T, P> | undefined)[]>;
    <T extends AnyTableDefinition, P extends ProjectionExpression<T> | undefined>(table: T, keys: PrimaryKey<T>[], options?: BatchGetOptions<T, P, true>): Promise<ProjectionResponse<T, P>[]>;
};
declare const batchGetItem: BatchGetItem;

type PrimaryKeyNames<T extends AnyTableDefinition, I extends IndexNames<T> | undefined> = (I extends IndexNames<T> ? T['indexes'][I]['sort'] extends string ? T['indexes'][I]['hash'] | T['indexes'][I]['sort'] : T['indexes'][I]['hash'] : T['sort'] extends string ? T['hash'] | T['sort'] : T['hash']);
type InferValue<T extends AnyTableDefinition, P extends PrimaryKeyNames<T, I>, I extends IndexNames<T> | undefined> = T['schema']['INPUT'][P];
type KeyCondition<T extends AnyTableDefinition, I extends IndexNames<T> | undefined> = Readonly<{
    where: <P extends PrimaryKeyNames<T, I>>(path: P) => Where<T, P, I>;
}>;
type Where<T extends AnyTableDefinition, P extends PrimaryKeyNames<T, I>, I extends IndexNames<T> | undefined> = Readonly<{
    eq: (value: InferValue<T, P, I>) => Combiner<T, I>;
    gt: (value: InferValue<T, P, I>) => Combiner<T, I>;
    gte: (value: InferValue<T, P, I>) => Combiner<T, I>;
    lt: (value: InferValue<T, P, I>) => Combiner<T, I>;
    lte: (value: InferValue<T, P, I>) => Combiner<T, I>;
    between: (min: InferValue<T, P, I>, max: InferValue<T, P, I>) => Combiner<T, I>;
    beginsWith: (value: InferValue<T, P, I>) => Combiner<T, I>;
}>;
type Combiner<T extends AnyTableDefinition, I extends IndexNames<T> | undefined> = Readonly<{
    and: KeyCondition<T, I>;
    or: KeyCondition<T, I>;
}>;

type PaginationOptions<T extends AnyTableDefinition, P extends ProjectionExpression<T> | undefined, I extends IndexNames<T> | undefined> = Options & {
    keyCondition: (exp: KeyCondition<T, I>) => void;
    projection?: P;
    index?: I;
    consistentRead?: boolean;
    forward?: boolean;
    limit?: number;
    cursor?: string;
};
type PaginationResponse<T extends AnyTableDefinition, P extends ProjectionExpression<T> | undefined> = {
    count: number;
    items: ProjectionResponse<T, P>[];
    cursor?: string;
};
declare const pagination: <T extends AnyTableDefinition, P extends ProjectionExpression<T> | undefined = undefined, I extends Extract<keyof T["indexes"], string> | undefined = undefined>(table: T, options: PaginationOptions<T, P, I>) => Promise<PaginationResponse<T, P>>;

type QueryOptions<T extends AnyTableDefinition, P extends ProjectionExpression<T> | undefined, I extends IndexNames<T> | undefined> = Options & {
    keyCondition: (exp: KeyCondition<T, I>) => void;
    projection?: P;
    index?: I;
    consistentRead?: boolean;
    forward?: boolean;
    limit?: number;
    cursor?: CursorKey<T, I>;
};
type QueryResponse<T extends AnyTableDefinition, P extends ProjectionExpression<T> | undefined, I extends IndexNames<T> | undefined> = {
    count: number;
    items: ProjectionResponse<T, P>[];
    cursor?: CursorKey<T, I>;
};
declare const query: <T extends AnyTableDefinition, P extends ProjectionExpression<T> | undefined = undefined, I extends Extract<keyof T["indexes"], string> | undefined = undefined>(table: T, options: QueryOptions<T, P, I>) => Promise<QueryResponse<T, P, I>>;

type ScanOptions<T extends AnyTableDefinition, P extends ProjectionExpression<T> | undefined, I extends IndexNames<T> | undefined> = Options & {
    projection?: P;
    index?: I;
    consistentRead?: boolean;
    limit?: number;
    cursor?: CursorKey<T, I>;
};
type ScanResponse<T extends AnyTableDefinition, P extends ProjectionExpression<T> | undefined, I extends IndexNames<T> | undefined> = {
    count: number;
    items: ProjectionResponse<T, P>[];
    cursor?: CursorKey<T, I>;
};
declare const scan: <T extends AnyTableDefinition, P extends ProjectionExpression<T> | undefined = undefined, I extends Extract<keyof T["indexes"], string> | undefined = undefined>(table: T, options?: ScanOptions<T, P, I>) => Promise<ScanResponse<T, P, I>>;

type Command = {
    TableName: string;
    ConditionExpression?: string;
    ExpressionAttributeNames?: Record<string, string>;
    ExpressionAttributeValues?: Record<string, AttributeValue>;
};
type ConditionCheck<T extends AnyTableDefinition> = {
    ConditionCheck: Command & {
        Key: PrimaryKey<T>;
        ConditionExpression: string;
    };
};
type Put<T extends AnyTableDefinition> = {
    Put: Command & {
        Item: T['schema']['INPUT'];
    };
};
type Update<T extends AnyTableDefinition> = {
    Update: Command & {
        Key: PrimaryKey<T>;
        UpdateExpression: string;
    };
};
type Delete<T extends AnyTableDefinition> = {
    Delete: Command & {
        Key: PrimaryKey<T>;
    };
};
type TransactWriteOptions = Options & {
    idempotantKey?: string;
    items: Transactable<any>[];
};
type Transactable<T extends AnyTableDefinition> = ConditionCheck<T> | Put<T> | Update<T> | Delete<T>;
declare const transactWrite: (options: TransactWriteOptions) => Promise<void>;
type ConditionCheckOptions<T extends AnyTableDefinition> = {
    condition: (exp: Condition<T>) => void;
};
declare const transactConditionCheck: <T extends AnyTableDefinition>(table: T, key: PrimaryKey<T, undefined>, options: ConditionCheckOptions<T>) => ConditionCheck<T>;
type PutOptions<T extends AnyTableDefinition> = {
    condition?: (exp: Condition<T>) => void;
};
declare const transactPut: <T extends AnyTableDefinition>(table: T, item: T["schema"]["INPUT"], options?: PutOptions<T>) => Put<T>;
type UpdateOptions<T extends AnyTableDefinition> = {
    update: (exp: UpdateExpression<T>) => void;
    condition?: (exp: Condition<T>) => void;
};
declare const transactUpdate: <T extends AnyTableDefinition>(table: T, key: PrimaryKey<T, undefined>, options: UpdateOptions<T>) => Update<T>;
type DeleteOptions<T extends AnyTableDefinition> = {
    condition?: (exp: Condition<T>) => void;
};
declare const transactDelete: <T extends AnyTableDefinition>(table: T, key: PrimaryKey<T, undefined>, options?: DeleteOptions<T>) => Delete<T>;

type MigrateOptions<From extends AnyTableDefinition, To extends AnyTableDefinition> = Options & {
    consistentRead?: boolean;
    batch?: number;
    transform: TransformCallback<From, To>;
};
type TransformCallback<From extends AnyTableDefinition, To extends AnyTableDefinition> = {
    (item: From['schema']['OUTPUT']): (To['schema']['INPUT'] | Promise<To['schema']['INPUT']>);
};
type MigrateResponse = {
    itemsProcessed: number;
};
declare const migrate: <From extends AnyTableDefinition, To extends AnyTableDefinition>(from: From, to: To, options: MigrateOptions<From, To>) => Promise<MigrateResponse>;

export { array, batchGetItem, bigfloat, bigint, bigintSet, binary, binarySet, boolean, define, deleteItem, dynamoDBClient, dynamoDBDocumentClient, getItem, migrate, mockDynamoDB, number, numberSet, object, optional, pagination, putItem, query, scan, string, stringSet, transactConditionCheck, transactDelete, transactPut, transactUpdate, transactWrite, updateItem };
