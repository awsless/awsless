import * as _aws_sdk_client_dynamodb from '@aws-sdk/client-dynamodb';
import { AttributeValue as AttributeValue$1, DynamoDBClient, CreateTableCommandInput } from '@aws-sdk/client-dynamodb';
export { BatchGetItemCommand, BatchWriteItemCommand, ConditionalCheckFailedException, DeleteItemCommand, DynamoDBClient, GetItemCommand, PutItemCommand, QueryCommand, ScanCommand, TransactGetItemsCommand, TransactWriteItemsCommand, TransactionCanceledException, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { NativeAttributeBinary, marshallOptions, unmarshallOptions } from '@aws-sdk/util-dynamodb';
import { BigFloat, Numeric } from '@awsless/big-float';
import { DynamoDBServer } from '@awsless/dynamodb-server';
export { DynamoDBServer } from '@awsless/dynamodb-server';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
export { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

type AnySchema = BaseSchema<any, any, any, Array<string | number>, Array<string | number>, boolean>;
type MarshallInputTypes = {
    S: string;
    N: string;
    B: NativeAttributeBinary;
    BOOL: boolean;
    M: Record<string, Partial<MarshallInputTypes>>;
    L: MarshallInputTypes[];
    SS: string[] | undefined;
    NS: string[] | undefined;
    BS: NativeAttributeBinary[] | undefined;
};
type MarshallOutputTypes = {
    S: string;
    N: string;
    B: Uint8Array;
    BOOL: boolean;
    M: Record<string, Partial<MarshallOutputTypes>>;
    L: MarshallOutputTypes[];
    SS: string[];
    NS: string[];
    BS: Uint8Array[];
};
type Types = keyof MarshallInputTypes;
type BaseSchema<Type extends Types, Input, Output, Paths extends Array<string | number> = [], OptionalPaths extends Array<string | number> = [], Optional extends boolean = false> = {
    readonly INPUT: Input;
    readonly OUTPUT: Output;
    readonly PATHS: Paths;
    readonly OPT_PATHS: OptionalPaths;
    readonly OPTIONAL: Optional;
    readonly type?: Type;
    readonly optional: Optional;
    encode(value: Input): MarshallInputTypes[Type];
    decode(value: MarshallOutputTypes[Type]): Output;
    marshall(value: Input): Record<Type, MarshallInputTypes[Type]> | undefined;
    unmarshall(value: Record<Type, MarshallOutputTypes[Type]>): Output;
    filterIn(value: Input | undefined): boolean;
    filterOut(value: Input | undefined): boolean;
    walk?(...path: Array<string | number>): AnySchema | undefined;
};

type Properties = Record<string, AnySchema>;
type KeyOf<S> = Extract<keyof S, string>;
type FilterOptional<S extends Properties> = {
    [K in KeyOf<S> as S[K]['OPTIONAL'] extends true ? K : never]?: S[K];
};
type FilterRequired<S extends Properties> = {
    [K in KeyOf<S> as S[K]['OPTIONAL'] extends true ? never : K]: S[K];
};
type Optinalize<S extends Properties> = FilterOptional<S> & FilterRequired<S>;
type InferInput<S extends Properties> = {
    [K in keyof Optinalize<S>]: S[K]['INPUT'];
};
type InferOutput<S extends Properties> = {
    [K in keyof Optinalize<S>]: S[K]['OUTPUT'];
};
type InferPaths<S extends Properties> = {
    [K in KeyOf<S>]: [K] | [K, ...S[K]['PATHS']];
}[KeyOf<S>];
type InferOptPaths<S extends Properties> = {
    [K in KeyOf<S>]: S[K]['OPTIONAL'] extends true ? [K] | [K, ...S[K]['OPT_PATHS']] : [];
}[KeyOf<S>];
type AnyObjectSchema = BaseSchema<'M', any, any, Array<string | number>, Array<string | number>, boolean>;
declare const object: <S extends Properties>(props: S) => BaseSchema<"M", InferInput<S>, InferOutput<S>, InferPaths<S>, InferOptPaths<S>, false>;

type Input<T extends AnyTable> = T['schema']['INPUT'];
type Output<T extends AnyTable> = T['schema']['OUTPUT'];
type AnyTable = Table<AnySchema, Extract<keyof AnySchema['INPUT'], string>, Extract<keyof AnySchema['INPUT'], string> | undefined, any>;
type IndexNames<T extends AnyTable> = keyof T['indexes'];
type TableIndex<Struct extends AnySchema> = {
    hash: Extract<keyof Struct['INPUT'], string>;
    sort?: Extract<keyof Struct['INPUT'], string> | undefined;
};
type TableIndexes<Struct extends AnySchema> = Record<string, TableIndex<Struct>>;
declare class Table<Schema extends AnyObjectSchema, Hash extends Extract<keyof Schema['INPUT'], string>, Sort extends Extract<keyof Schema['INPUT'], string> | undefined, Indexes extends TableIndexes<Schema> | undefined> {
    readonly name: string;
    readonly hash: Hash;
    readonly sort: Sort;
    readonly schema: Schema;
    readonly indexes: Indexes;
    constructor(name: string, opt: {
        hash: Hash;
        sort?: Sort;
        schema: Schema;
        indexes?: Indexes;
    });
    marshall(item: Partial<Schema['INPUT']>): Record<string, AttributeValue$1>;
    unmarshall(item: any): Schema['OUTPUT'];
}
declare const define: <Schema extends AnyObjectSchema, Hash extends Extract<keyof Schema["INPUT"], string>, Sort extends Extract<keyof Schema["INPUT"], string> | undefined, Indexes extends TableIndexes<Schema> | undefined>(name: string, options: {
    hash: Hash;
    sort?: Sort;
    schema: Schema;
    indexes?: Indexes;
}) => Table<Schema, Hash, Sort, Indexes>;

type Key<T extends AnyTable, K extends keyof T['schema']['INPUT']> = Required<Record<K, T['schema']['INPUT'][K]>>;
type HashKey<T extends AnyTable, I extends IndexNames<T> | undefined = undefined> = I extends IndexNames<T> ? Key<T, T['indexes'][I]['hash']> : Key<T, T['hash']>;
type SortKey<T extends AnyTable, I extends IndexNames<T> | undefined = undefined> = I extends IndexNames<T> ? T['indexes'][I]['sort'] extends string ? Key<T, T['indexes'][I]['sort']> : {} : T['sort'] extends string ? Key<T, T['sort']> : {};
type PrimaryKey<T extends AnyTable, I extends IndexNames<T> | undefined = undefined> = HashKey<T, I> & SortKey<T, I>;
type CursorKey<T extends AnyTable, I extends IndexNames<T> | undefined = undefined> = PrimaryKey<T> & (I extends IndexNames<T> ? PrimaryKey<T, I> : {});

type AttributeTypes = keyof AttributeValue$1;

type AttributeValue = any;

type WalkPath<Object, Path extends Array<unknown>> = Path extends [infer Key extends keyof Object, ...infer Rest] ? WalkPath<Object[Key], Rest> : Object;
type InferPath<T extends AnyTable> = T['schema']['PATHS'];
type InferValue$1<T extends AnyTable, P extends InferPath<T>> = WalkPath<T['schema']['INPUT'], P>;
type InferSetValue<T extends AnyTable, P extends InferPath<T>> = Parameters<InferValue$1<T, P>['add']>[0];

type QueryValue<T extends AnyTable> = {
    v: AttributeValue;
    p?: InferPath<T>;
};
type QueryPath<T extends AnyTable> = {
    p: InferPath<T>;
};
declare const key$1: unique symbol;
declare const cursor: unique symbol;
type QueryItem<T extends AnyTable> = QueryBulder<T> | QueryValue<T> | QueryPath<T> | typeof cursor | string;
declare class QueryBulder<T extends AnyTable> {
    [key$1]: {
        parent: QueryBulder<T> | undefined;
        items: QueryItem<T>[];
    };
    constructor(parent?: QueryBulder<T> | undefined, items?: QueryItem<T>[]);
}

declare class Condition<T extends AnyTable> extends QueryBulder<T> {
    where<P extends InferPath<T>>(...path: P): Where$1<T, P>;
    group<R extends Combine$1<T>>(fn: (exp: Condition<T>) => R): Combine$1<T>;
    extend<R extends Combine$1<T> | Condition<T>>(fn: (exp: Condition<T>) => R): R;
}
declare class Where$1<T extends AnyTable, P extends InferPath<T>> extends QueryBulder<T> {
    private path;
    constructor(query: QueryBulder<T>, items: QueryItem<T>[], path: P);
    get not(): Where$1<T, P>;
    get exists(): Combine$1<T>;
    get size(): Size<T, P>;
    private compare;
    private fn;
    eq(value: InferValue$1<T, P>): Combine$1<T>;
    nq(value: InferValue$1<T, P>): Combine$1<T>;
    gt(value: InferValue$1<T, P>): Combine$1<T>;
    gte(value: InferValue$1<T, P>): Combine$1<T>;
    lt(value: InferValue$1<T, P>): Combine$1<T>;
    lte(value: InferValue$1<T, P>): Combine$1<T>;
    between(min: InferValue$1<T, P>, max: InferValue$1<T, P>): Combine$1<T>;
    in(values: InferValue$1<T, P>[]): Combine$1<T>;
    attributeType(value: AttributeTypes): Combine$1<T>;
    beginsWith(value: string): Combine$1<T>;
    contains(value: InferSetValue<T, P>): Combine$1<T>;
}
declare class Size<T extends AnyTable, P extends InferPath<T>> extends QueryBulder<T> {
    private path;
    constructor(query: QueryBulder<T>, path: P);
    private compare;
    eq(value: number | bigint | BigFloat): Combine$1<T>;
    nq(value: number | bigint | BigFloat): Combine$1<T>;
    gt(value: number | bigint | BigFloat): Combine$1<T>;
    gte(value: number | bigint | BigFloat): Combine$1<T>;
    lt(value: number | bigint | BigFloat): Combine$1<T>;
    lte(value: number | bigint | BigFloat): Combine$1<T>;
    between(min: number | bigint | BigFloat, max: number | bigint | BigFloat): Combine$1<T>;
}
declare class Combine$1<T extends AnyTable> extends QueryBulder<T> {
    get and(): Condition<T>;
    get or(): Condition<T>;
}

declare const key: unique symbol;
type ChainData<T extends AnyTable> = {
    readonly set: QueryItem<T>[][];
    readonly add: QueryItem<T>[][];
    readonly rem: QueryItem<T>[][];
    readonly del: QueryItem<T>[][];
};
declare class Chain<T extends AnyTable> {
    [key]: ChainData<T>;
    constructor(data: ChainData<T>);
}
declare class UpdateExpression<T extends AnyTable> extends Chain<T> {
    /** Update a given property */
    update<P extends InferPath<T>>(...path: P): Update<T, P>;
    extend<R extends UpdateExpression<T> | void>(fn: (exp: UpdateExpression<T>) => R): R;
}
declare class Update<T extends AnyTable, P extends InferPath<T>> extends Chain<T> {
    private path;
    constructor(query: ChainData<T>, path: P);
    private u;
    private i;
    private isDeletableValue;
    /** Set a value */
    set(value: InferValue$1<T, P>): UpdateExpression<T>;
    /** Set a value if the attribute doesn't already exists */
    setIfNotExists(value: InferValue$1<T, P>): UpdateExpression<T>;
    /** Set a attribute to a different but already existing attribute */
    setAttr(...path: InferPath<T>): UpdateExpression<T>;
    /** Delete a property */
    del(): UpdateExpression<T>;
    /** Increment a numeric value */
    incr(value?: number | bigint | BigFloat, initialValue?: number | bigint | BigFloat): UpdateExpression<T>;
    /** Decrement a numeric value */
    decr(value?: number | bigint | BigFloat, initialValue?: number | bigint | BigFloat): UpdateExpression<T>;
    /** Append values to a Set */
    append(values: InferValue$1<T, P>): UpdateExpression<T>;
    /** Remove values from a Set */
    remove(values: InferValue$1<T, P>): UpdateExpression<T>;
}

type ReturnValues = 'NONE' | 'ALL_OLD' | 'UPDATED_OLD' | 'ALL_NEW' | 'UPDATED_NEW';
type LimitedReturnValues = 'NONE' | 'ALL_OLD';
type ReturnResponse<T extends AnyTable, R extends ReturnValues = 'NONE'> = R extends 'NONE' ? void : R extends 'ALL_NEW' | 'ALL_OLD' ? T['schema']['OUTPUT'] | undefined : Partial<T['schema']['OUTPUT']> | undefined;

interface Options {
    client?: DynamoDBClient;
    debug?: boolean;
}
interface MutateOptions<T extends AnyTable, R extends ReturnValues = 'NONE'> extends Options {
    condition?: (exp: Condition<T>) => Combine$1<T>;
    return?: R;
}

type Command = {
    TableName: string;
    ConditionExpression?: string;
    ExpressionAttributeNames?: Record<string, string>;
    ExpressionAttributeValues?: Record<string, any>;
};
type TransactConditionCheck = {
    ConditionCheck: Command & {
        Key: any;
        ConditionExpression: string;
    };
};
type TransactPut = {
    Put: Command & {
        Item: any;
    };
};
type TransactUpdate = {
    Update: Command & {
        Key: any;
        UpdateExpression: string;
    };
};
type TransactDelete = {
    Delete: Command & {
        Key: any;
    };
};
type Transactable = TransactConditionCheck | TransactPut | TransactUpdate | TransactDelete;
type TransactWriteOptions = Options & {
    idempotantKey?: string;
    items: Transactable[];
};
declare const transactWrite: (options: TransactWriteOptions) => Promise<void>;
type ConditionCheckOptions<T extends AnyTable> = {
    condition: (exp: Condition<T>) => Combine$1<T>;
};
declare const transactConditionCheck: <T extends AnyTable>(table: T, key: PrimaryKey<T>, options: ConditionCheckOptions<T>) => TransactConditionCheck;
type PutOptions<T extends AnyTable> = {
    condition?: (exp: Condition<T>) => Combine$1<T>;
};
declare const transactPut: <T extends AnyTable>(table: T, item: T["schema"]["INPUT"], options?: PutOptions<T>) => TransactPut;
type UpdateOptions$1<T extends AnyTable> = {
    update: (exp: UpdateExpression<T>) => UpdateExpression<T>;
    condition?: (exp: Condition<T>) => Combine$1<T>;
};
declare const transactUpdate: <T extends AnyTable>(table: T, key: PrimaryKey<T>, options: UpdateOptions$1<T>) => TransactUpdate;
type DeleteOptions<T extends AnyTable> = {
    condition?: (exp: Condition<T>) => Combine$1<T>;
};
declare const transactDelete: <T extends AnyTable>(table: T, key: PrimaryKey<T>, options?: DeleteOptions<T>) => TransactDelete;

declare const optional: <I, O, P extends Array<string | number> = [], OP extends Array<string | number> = []>(schema: BaseSchema<any, I, O, P, OP, false>) => BaseSchema<keyof MarshallInputTypes, I | undefined, O | undefined, P, OP, true>;

type UnknownOptions = {
    marshall?: marshallOptions;
    unmarshall?: unmarshallOptions;
};
declare const unknown: (opts?: UnknownOptions) => BaseSchema<keyof MarshallInputTypes, unknown, unknown, [], [], false>;

declare const any: (opts?: UnknownOptions) => BaseSchema<Types, any, any>;

type AllowedSchema = BaseSchema<'S', any, any> | BaseSchema<'N', any, any> | BaseSchema<'B', any, any>;
declare const set: <S extends AllowedSchema>(schema: S) => BaseSchema<`${Exclude<S["type"], undefined>}S`, Set<S["INPUT"]>, Set<S["OUTPUT"]>, [], [], false>;

declare const uuid: () => BaseSchema<"S", `${string}-${string}-${string}-${string}-${string}`, `${string}-${string}-${string}-${string}-${string}`, [], [], false>;

declare function string(): BaseSchema<'S', string, string>;
declare function string<T extends string>(): BaseSchema<'S', T, T>;

declare const boolean: () => BaseSchema<"BOOL", boolean, boolean, [], [], false>;

declare function number(): BaseSchema<'N', number, number>;
declare function number<T extends number>(): BaseSchema<'N', T, T>;

declare function bigint(): BaseSchema<'N', bigint, bigint>;
declare function bigint<T extends bigint>(): BaseSchema<'N', T, T>;

declare const bigfloat: () => BaseSchema<"N", Numeric, BigFloat, [], [], false>;

declare const binary: () => BaseSchema<"B", NativeAttributeBinary, Uint8Array<ArrayBufferLike>, [], [], false>;

type RecordPaths<S extends AnySchema> = [string] | [string, ...S['PATHS']];
type RecordOptPaths<S extends AnySchema> = [string] | [string, ...S['OPT_PATHS']];
declare const record: <S extends AnySchema>(schema: S) => BaseSchema<"M", Record<string, S["INPUT"]>, Record<string, S["OUTPUT"]>, RecordPaths<S>, RecordOptPaths<S>, false>;

type ArrayPaths<L extends AnySchema> = [number] | [number, ...L['PATHS']];
type ArrayOptPaths<L extends AnySchema> = [number] | [number, ...L['OPT_PATHS']];
type RequiredSchema = BaseSchema<any, any, any, Array<string | number>, Array<string | number>, false>;
declare const array: <S extends RequiredSchema>(schema: S) => BaseSchema<"L", S["INPUT"][], S["OUTPUT"][], ArrayPaths<S>, ArrayOptPaths<S>, false>;

declare const date: () => BaseSchema<"N", Date, Date, [], [], false>;

declare const json: <T = unknown>() => BaseSchema<"S", T, T, [], [], false>;

declare const ttl: () => BaseSchema<"N", Date, Date, [], [], false>;

type StringEnum = {
    [key: string | number]: string;
};
declare const stringEnum: <T extends StringEnum>(_: T) => BaseSchema<"S", T[keyof T], T[keyof T], [], [], false>;

type NumberEnum = {
    [key: number | string]: number | string;
};
declare const numberEnum: <T extends NumberEnum>(_: T) => BaseSchema<"N", T[keyof T], T[keyof T], [], [], false>;

type StreamData<T extends AnyTable> = {
    Keys: PrimaryKey<T>;
    OldImage?: Output<T>;
    NewImage?: Output<T>;
};
type StreamRequest<T extends AnyTable> = {
    Records: {
        eventName: 'MODIFY' | 'INSERT' | 'REMOVE';
        dynamodb: StreamData<T>;
    }[];
};
type Stream<T extends AnyTable> = {
    table: T;
    fn: (payload: StreamRequest<T>) => unknown | void;
};
declare const streamTable: <T extends AnyTable>(table: T, fn: (payload: StreamRequest<T>) => unknown | void) => Stream<AnyTable>;

type SeedTable<T extends AnyTable> = {
    table: T;
    items: Input<T>[];
};
type Tables = CreateTableCommandInput | CreateTableCommandInput[] | AnyTable | AnyTable[];
type StartDynamoDBOptions<T extends Tables> = {
    tables: T;
    stream?: Stream<AnyTable>[];
    timeout?: number;
    seed?: SeedTable<AnyTable>[];
};
declare const mockDynamoDB: <T extends Tables>(configOrServer: StartDynamoDBOptions<T> | DynamoDBServer) => DynamoDBServer;

declare const migrate: (client: DynamoDBClient, tables: CreateTableCommandInput | CreateTableCommandInput[] | AnyTable | AnyTable[]) => Promise<_aws_sdk_client_dynamodb.CreateTableCommandOutput[]>;

declare const seedTable: <T extends AnyTable>(table: T, items: Input<T>[]) => {
    table: T;
    items: Input<T>[];
};
declare const seed: (defs: ReturnType<typeof seedTable>[]) => Promise<void>;

declare const dynamoDBClient: {
    (): DynamoDBClient;
    set(client: DynamoDBClient): void;
};
declare const dynamoDBDocumentClient: {
    (): DynamoDBDocumentClient;
    set(client: DynamoDBDocumentClient): void;
};

declare module '@aws-sdk/client-dynamodb' {
    interface TransactionCanceledException {
        conditionFailedAt: (...indexes: number[]) => boolean;
    }
}

type DeepPick<O, P> = P extends keyof O ? {
    [_ in P]: O[P];
} : P extends [infer K] ? K extends keyof O ? {
    [_ in K]: O[K];
} : never : P extends [infer K, ...infer R] ? K extends keyof O ? {
    [_ in K]: DeepPick<O[K], R>;
} : never : never;
type DeepPickList<O, P extends unknown[]> = {
    [K in keyof P]: DeepPick<O, P[K]>;
}[number];
type Merge<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;
type ProjectionExpression<T extends AnyTable> = Array<T['schema']['PATHS'] | Exclude<T['schema']['PATHS'][number], number>>;
type ProjectionResponse<T extends AnyTable, P extends ProjectionExpression<T> | undefined> = P extends ProjectionExpression<T> ? Merge<DeepPickList<T['schema']['OUTPUT'], P>> : T['schema']['OUTPUT'];

declare const getItem: <T extends AnyTable, P extends ProjectionExpression<T> | undefined = undefined>(table: T, key: PrimaryKey<T>, options?: Options & {
    consistentRead?: boolean;
    projection?: P;
}) => Promise<ProjectionResponse<T, P> | undefined>;

declare const putItem: <T extends AnyTable, R extends LimitedReturnValues = "NONE">(table: T, item: T["schema"]["INPUT"], options?: MutateOptions<T, R>) => Promise<ReturnResponse<T, R>>;

type UpdateOptions<T extends AnyTable, R extends ReturnValues = 'NONE'> = MutateOptions<T, R> & {
    update: (exp: UpdateExpression<T>) => UpdateExpression<T>;
};
declare const updateItem: <T extends AnyTable, R extends ReturnValues = "NONE">(table: T, key: PrimaryKey<T>, options: UpdateOptions<T, R>) => Promise<ReturnResponse<T, R>>;

declare const deleteItem: <T extends AnyTable, R extends LimitedReturnValues = "NONE">(table: T, key: PrimaryKey<T>, options?: MutateOptions<T, R>) => Promise<ReturnResponse<T, R>>;

declare const getIndexedItem: <T extends AnyTable, I extends IndexNames<T>, P extends ProjectionExpression<T> | undefined = undefined>(table: T, key: PrimaryKey<T, I>, options: Options & {
    index: I;
    projection?: P;
}) => Promise<ProjectionResponse<T, P> | undefined>;

type BatchGetOptions<T extends AnyTable, P extends ProjectionExpression<T> | undefined, F extends boolean> = Options & {
    projection?: P;
    consistentRead?: boolean;
    filterNonExistentItems?: F;
};
type BatchGetItem = {
    <T extends AnyTable, P extends ProjectionExpression<T> | undefined>(table: T, keys: PrimaryKey<T>[], options?: BatchGetOptions<T, P, false>): Promise<(ProjectionResponse<T, P> | undefined)[]>;
    <T extends AnyTable, P extends ProjectionExpression<T> | undefined>(table: T, keys: PrimaryKey<T>[], options?: BatchGetOptions<T, P, true>): Promise<ProjectionResponse<T, P>[]>;
};
declare const batchGetItem: BatchGetItem;

declare const batchPutItem: <T extends AnyTable>(table: T, items: T["schema"]["INPUT"][], options?: Options) => Promise<void>;

declare const batchDeleteItem: <T extends AnyTable>(table: T, keys: PrimaryKey<T>[], options?: Options) => Promise<void>;

type PrimaryKeyNames<T extends AnyTable, I extends IndexNames<T> | undefined> = I extends IndexNames<T> ? T['indexes'][I]['sort'] extends string ? T['indexes'][I]['hash'] | T['indexes'][I]['sort'] : T['indexes'][I]['hash'] : T['sort'] extends string ? T['hash'] | T['sort'] : T['hash'];
type InferValue<T extends AnyTable, P extends PrimaryKeyNames<T, I>, I extends IndexNames<T> | undefined> = T['schema']['INPUT'][P];
declare class KeyCondition<T extends AnyTable, I extends IndexNames<T> | undefined> extends QueryBulder<T> {
    where<P extends PrimaryKeyNames<T, I>>(path: P): Where<T, P, I>;
    extend<R extends Combine<T, I> | KeyCondition<T, I> | void>(fn: (exp: KeyCondition<T, I>) => R): R;
}
declare class Where<T extends AnyTable, P extends PrimaryKeyNames<T, I>, I extends IndexNames<T> | undefined> extends QueryBulder<T> {
    private path;
    constructor(query: QueryBulder<T>, path: P);
    private compare;
    eq(value: InferValue<T, P, I>): Combine<T, I>;
    gt(value: InferValue<T, P, I>): Combine<T, I>;
    gte(value: InferValue<T, P, I>): Combine<T, I>;
    lt(value: InferValue<T, P, I>): Combine<T, I>;
    lte(value: InferValue<T, P, I>): Combine<T, I>;
    between(min: InferValue<T, P, I>, max: InferValue<T, P, I>): Combine<T, I>;
    beginsWith(value: InferValue<T, P, I>): Combine<T, I>;
}
declare class Combine<T extends AnyTable, I extends IndexNames<T> | undefined> extends QueryBulder<T> {
    get and(): KeyCondition<T, I>;
    get or(): KeyCondition<T, I>;
}

type QueryOptions<T extends AnyTable, P extends ProjectionExpression<T> | undefined, I extends IndexNames<T> | undefined> = Options & {
    keyCondition: (exp: KeyCondition<T, I>) => Combine<T, I>;
    projection?: P;
    index?: I;
    consistentRead?: boolean;
    forward?: boolean;
    limit?: number;
    cursor?: CursorKey<T, I>;
};
type QueryResponse<T extends AnyTable, P extends ProjectionExpression<T> | undefined, I extends IndexNames<T> | undefined> = {
    count: number;
    items: ProjectionResponse<T, P>[];
    cursor?: CursorKey<T, I>;
};
declare const query: <T extends AnyTable, P extends ProjectionExpression<T> | undefined = undefined, I extends IndexNames<T> | undefined = undefined>(table: T, options: QueryOptions<T, P, I>) => Promise<QueryResponse<T, P, I>>;

type ScanOptions<T extends AnyTable, P extends ProjectionExpression<T> | undefined, I extends IndexNames<T> | undefined> = Options & {
    projection?: P;
    index?: I;
    consistentRead?: boolean;
    limit?: number;
    cursor?: CursorKey<T, I>;
};
type ScanResponse<T extends AnyTable, P extends ProjectionExpression<T> | undefined, I extends IndexNames<T> | undefined> = {
    count: number;
    items: ProjectionResponse<T, P>[];
    cursor?: CursorKey<T, I>;
};
declare const scan: <T extends AnyTable, P extends ProjectionExpression<T> | undefined = undefined, I extends IndexNames<T> | undefined = undefined>(table: T, options?: ScanOptions<T, P, I>) => Promise<ScanResponse<T, P, I>>;

type QueryAllOptions<T extends AnyTable, P extends ProjectionExpression<T> | undefined, I extends IndexNames<T> | undefined> = Options & {
    keyCondition: (exp: KeyCondition<T, I>) => Combine<T, I>;
    projection?: P;
    index?: I;
    consistentRead?: boolean;
    forward?: boolean;
    cursor?: CursorKey<T, I>;
    batch: number;
};
declare const queryAll: <T extends AnyTable, P extends ProjectionExpression<T> | undefined, I extends IndexNames<T> | undefined>(table: T, options: QueryAllOptions<T, P, I>) => AsyncGenerator<ProjectionResponse<T, P>[], void, void>;

type ScanAllOptions<T extends AnyTable, P extends ProjectionExpression<T> | undefined> = Options & {
    projection?: P;
    consistentRead?: boolean;
    batch: number;
    cursor?: CursorKey<T>;
};
declare const scanAll: <T extends AnyTable, P extends ProjectionExpression<T> | undefined>(table: T, options: ScanAllOptions<T, P>) => AsyncGenerator<ProjectionResponse<T, P>[], void, void>;

type PaginateQueryOptions<T extends AnyTable, P extends ProjectionExpression<T> | undefined, I extends IndexNames<T> | undefined> = Options & {
    keyCondition: (exp: KeyCondition<T, I>) => Combine<T, I>;
    projection?: P;
    index?: I;
    consistentRead?: boolean;
    forward?: boolean;
    limit?: number;
    cursor?: string;
};
type PaginateQueryResponse<T extends AnyTable, P extends ProjectionExpression<T> | undefined> = {
    count: number;
    items: ProjectionResponse<T, P>[];
    cursor?: string;
};
declare const paginateQuery: <T extends AnyTable, P extends ProjectionExpression<T> | undefined = undefined, I extends IndexNames<T> | undefined = undefined>(table: T, options: PaginateQueryOptions<T, P, I>) => Promise<PaginateQueryResponse<T, P>>;

type PaginateScanOptions<T extends AnyTable, P extends ProjectionExpression<T> | undefined, I extends IndexNames<T> | undefined> = Options & {
    projection?: P;
    index?: I;
    consistentRead?: boolean;
    limit?: number;
    cursor?: string;
};
type PaginateScanResponse<T extends AnyTable, P extends ProjectionExpression<T> | undefined> = {
    count: number;
    items: ProjectionResponse<T, P>[];
    cursor?: string;
};
declare const paginateScan: <T extends AnyTable, P extends ProjectionExpression<T> | undefined = undefined, I extends IndexNames<T> | undefined = undefined>(table: T, options?: PaginateScanOptions<T, P, I>) => Promise<PaginateScanResponse<T, P>>;

export { type AnyTable, type CursorKey, type HashKey, type Input, type Output, type PrimaryKey, type SortKey, Table, type TransactConditionCheck, type TransactDelete, type TransactPut, type TransactUpdate, type Transactable, any, array, batchDeleteItem, batchGetItem, batchPutItem, bigfloat, bigint, binary, boolean, date, define, deleteItem, dynamoDBClient, dynamoDBDocumentClient, getIndexedItem, getItem, json, migrate, mockDynamoDB, number, numberEnum, object, optional, paginateQuery, paginateScan, putItem, query, queryAll, record, scan, scanAll, seed, seedTable, set, streamTable, string, stringEnum, transactConditionCheck, transactDelete, transactPut, transactUpdate, transactWrite, ttl, unknown, updateItem, uuid };
