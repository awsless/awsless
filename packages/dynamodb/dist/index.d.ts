import * as _aws_sdk_client_dynamodb from '@aws-sdk/client-dynamodb';
import { AttributeValue as AttributeValue$1, DynamoDBClient, CreateTableCommandInput } from '@aws-sdk/client-dynamodb';
export { BatchGetItemCommand, BatchWriteItemCommand, ConditionalCheckFailedException, DeleteItemCommand, DynamoDBClient, GetItemCommand, PutItemCommand, QueryCommand, ScanCommand, TransactGetItemsCommand, TransactWriteItemsCommand, TransactionCanceledException, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { BigFloat, Numeric } from '@awsless/big-float';
import { NativeAttributeBinary, NativeAttributeValue, NativeScalarAttributeValue } from '@aws-sdk/util-dynamodb';
import { DynamoDBServer } from '@awsless/dynamodb-server';
export { DynamoDBServer } from '@awsless/dynamodb-server';
import * as superstruct_dist_utils from 'superstruct/dist/utils';
import { Struct as Struct$1 } from '@awsless/validate';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
export { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

type AttributeTypes = keyof AttributeValue$1;
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
    filterIn(value: Input | undefined): boolean;
    filterOut(value: Input | undefined): boolean;
    marshall(value: Input): Record<Type, Marshalled>;
    unmarshall(value: Record<Type, Marshalled>): Output;
}

type InferInput$1<T extends AnyTableDefinition> = T['schema']['INPUT'];
type InferOutput$1<T extends AnyTableDefinition> = T['schema']['OUTPUT'];
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

type Key<T extends AnyTableDefinition, K extends keyof T['schema']['INPUT']> = Required<Record<K, T['schema']['INPUT'][K]>>;
type HashKey<T extends AnyTableDefinition, I extends IndexNames<T> | undefined = undefined> = (I extends IndexNames<T> ? Key<T, T['indexes'][I]['hash']> : Key<T, T['hash']>);
type SortKey<T extends AnyTableDefinition, I extends IndexNames<T> | undefined = undefined> = (I extends IndexNames<T> ? T['indexes'][I]['sort'] extends string ? Key<T, T['indexes'][I]['sort']> : {} : T['sort'] extends string ? Key<T, T['sort']> : {});
type PrimaryKey<T extends AnyTableDefinition, I extends IndexNames<T> | undefined = undefined> = HashKey<T, I> & SortKey<T, I>;
type CursorKey<T extends AnyTableDefinition, I extends IndexNames<T> | undefined = undefined> = PrimaryKey<T> & (I extends IndexNames<T> ? PrimaryKey<T, I> : {});

type AttributeValue = NativeAttributeBinary | NativeAttributeValue | NativeScalarAttributeValue;

type WalkPath<Object, Path extends Array<unknown>> = (Path extends [infer Key extends keyof Object, ...infer Rest] ? WalkPath<Object[Key], Rest> : Object);
type InferPath<T extends AnyTableDefinition> = T['schema']['PATHS'];
type InferValue$1<T extends AnyTableDefinition, P extends InferPath<T>> = WalkPath<T['schema']['INPUT'], P>;
type InferSetValue<T extends AnyTableDefinition, P extends InferPath<T>> = Parameters<InferValue$1<T, P>['add']>[0];

type QueryValue<T extends AnyTableDefinition> = {
    v: AttributeValue;
    p?: InferPath<T>;
};
type QueryPath<T extends AnyTableDefinition> = {
    p: InferPath<T>;
};
declare const key$1: unique symbol;
declare const cursor: unique symbol;
type QueryItem<T extends AnyTableDefinition> = QueryBulder<T> | QueryValue<T> | QueryPath<T> | typeof cursor | string;
declare class QueryBulder<T extends AnyTableDefinition> {
    [key$1]: {
        parent: QueryBulder<T> | undefined;
        items: QueryItem<T>[];
    };
    constructor(parent?: QueryBulder<T> | undefined, items?: QueryItem<T>[]);
}

declare class Condition<T extends AnyTableDefinition> extends QueryBulder<T> {
    where<P extends InferPath<T>>(...path: P): Where$1<T, P>;
    group<R extends Combine$1<T>>(fn: (exp: Condition<T>) => R): Combine$1<T>;
    extend<R extends Combine$1<T> | Condition<T>>(fn: (exp: Condition<T>) => R): R;
}
declare class Where$1<T extends AnyTableDefinition, P extends InferPath<T>> extends QueryBulder<T> {
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
declare class Size<T extends AnyTableDefinition, P extends InferPath<T>> extends QueryBulder<T> {
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
declare class Combine$1<T extends AnyTableDefinition> extends QueryBulder<T> {
    get and(): Condition<T>;
    get or(): Condition<T>;
}

declare const key: unique symbol;
type ChainData<T extends AnyTableDefinition> = {
    readonly set: QueryItem<T>[][];
    readonly add: QueryItem<T>[][];
    readonly rem: QueryItem<T>[][];
    readonly del: QueryItem<T>[][];
};
declare class Chain<T extends AnyTableDefinition> {
    [key]: ChainData<T>;
    constructor(data: ChainData<T>);
}
declare class UpdateExpression<T extends AnyTableDefinition> extends Chain<T> {
    /** Update a given property */
    update<P extends InferPath<T>>(...path: P): Update<T, P>;
    extend<R extends UpdateExpression<T> | void>(fn: (exp: UpdateExpression<T>) => R): R;
}
declare class Update<T extends AnyTableDefinition, P extends InferPath<T>> extends Chain<T> {
    private path;
    constructor(query: ChainData<T>, path: P);
    private u;
    private i;
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
type ReturnResponse<T extends AnyTableDefinition, R extends ReturnValues | LimitedReturnValues = 'NONE'> = (R extends 'NONE' ? void : R extends 'ALL_NEW' | 'ALL_OLD' ? T['schema']['OUTPUT'] | undefined : Partial<T['schema']['OUTPUT']> | undefined);

interface Options {
    client?: DynamoDBClient;
    debug?: boolean;
}
interface MutateOptions<T extends AnyTableDefinition, R extends ReturnValues = 'NONE'> extends Options {
    condition?: (exp: Condition<T>) => Combine$1<T>;
    return?: R;
}

type Command = {
    TableName: string;
    ConditionExpression?: string;
    ExpressionAttributeNames?: Record<string, string>;
    ExpressionAttributeValues?: Record<string, AttributeValue>;
};
type TransactConditionCheck<T extends AnyTableDefinition> = {
    ConditionCheck: Command & {
        Key: PrimaryKey<T>;
        ConditionExpression: string;
    };
};
type TransactPut<T extends AnyTableDefinition> = {
    Put: Command & {
        Item: T['schema']['INPUT'];
    };
};
type TransactUpdate<T extends AnyTableDefinition> = {
    Update: Command & {
        Key: PrimaryKey<T>;
        UpdateExpression: string;
    };
};
type TransactDelete<T extends AnyTableDefinition> = {
    Delete: Command & {
        Key: PrimaryKey<T>;
    };
};
type Transactable<T extends AnyTableDefinition> = TransactConditionCheck<T> | TransactPut<T> | TransactUpdate<T> | TransactDelete<T>;
type TransactWriteOptions = Options & {
    idempotantKey?: string;
    items: Transactable<any>[];
};
declare const transactWrite: (options: TransactWriteOptions) => Promise<void>;
type ConditionCheckOptions<T extends AnyTableDefinition> = {
    condition: (exp: Condition<T>) => Combine$1<T>;
};
declare const transactConditionCheck: <T extends AnyTableDefinition>(table: T, key: PrimaryKey<T, undefined>, options: ConditionCheckOptions<T>) => TransactConditionCheck<T>;
type PutOptions<T extends AnyTableDefinition> = {
    condition?: (exp: Condition<T>) => Combine$1<T>;
};
declare const transactPut: <T extends AnyTableDefinition>(table: T, item: T["schema"]["INPUT"], options?: PutOptions<T>) => TransactPut<T>;
type UpdateOptions$1<T extends AnyTableDefinition> = {
    update: (exp: UpdateExpression<T>) => UpdateExpression<T>;
    condition?: (exp: Condition<T>) => Combine$1<T>;
};
declare const transactUpdate: <T extends AnyTableDefinition>(table: T, key: PrimaryKey<T, undefined>, options: UpdateOptions$1<T>) => TransactUpdate<T>;
type DeleteOptions<T extends AnyTableDefinition> = {
    condition?: (exp: Condition<T>) => Combine$1<T>;
};
declare const transactDelete: <T extends AnyTableDefinition>(table: T, key: PrimaryKey<T, undefined>, options?: DeleteOptions<T>) => TransactDelete<T>;

declare const optional: <M, I, O, P extends (string | number)[] = [], OP extends (string | number)[] = [], T extends "S" | "N" | "B" | "SS" | "NS" | "BS" | "M" | "L" | "NULL" | "BOOL" | "$unknown" = "S" | "N" | "B" | "SS" | "NS" | "BS" | "M" | "L" | "NULL" | "BOOL" | "$unknown">(struct: Struct<M, I, O, P, OP, T, false>) => Struct<M, I, O, P, OP, T, true>;

declare class Any {
    readonly MARSHALLED: any;
    readonly INPUT: any;
    readonly OUTPUT: any;
    readonly PATHS: [];
    readonly OPT_PATHS: [];
    filterIn(value: any): boolean;
    filterOut(value: any): boolean;
    marshall(value: any): any;
    unmarshall(value: any): any;
    _marshall(value: any): any;
    _unmarshall(value: any): any;
    type: any;
    optional: boolean;
    walk: undefined;
}
declare const any: () => Any;

declare const uuid: () => Struct<`${string}-${string}-${string}-${string}-${string}`, `${string}-${string}-${string}-${string}-${string}`, `${string}-${string}-${string}-${string}-${string}`, [], [], "S" | "N" | "B" | "SS" | "NS" | "BS" | "M" | "L" | "NULL" | "BOOL" | "$unknown", false>;

declare const string: () => Struct<string, string, string, [], [], "S" | "N" | "B" | "SS" | "NS" | "BS" | "M" | "L" | "NULL" | "BOOL" | "$unknown", false>;

declare const boolean: () => Struct<boolean, boolean, boolean, [], [], "S" | "N" | "B" | "SS" | "NS" | "BS" | "M" | "L" | "NULL" | "BOOL" | "$unknown", false>;

declare const number: () => Struct<string, number, number, [], [], "S" | "N" | "B" | "SS" | "NS" | "BS" | "M" | "L" | "NULL" | "BOOL" | "$unknown", false>;

declare const bigint: () => Struct<string, bigint, bigint, [], [], "S" | "N" | "B" | "SS" | "NS" | "BS" | "M" | "L" | "NULL" | "BOOL" | "$unknown", false>;

declare const bigfloat: () => Struct<string, Numeric, BigFloat, [], [], "S" | "N" | "B" | "SS" | "NS" | "BS" | "M" | "L" | "NULL" | "BOOL" | "$unknown", false>;

declare const binary: () => Struct<NativeAttributeBinary, NativeAttributeBinary, Uint8Array, [], [], "S" | "N" | "B" | "SS" | "NS" | "BS" | "M" | "L" | "NULL" | "BOOL" | "$unknown", false>;

type Schema = Record<string | symbol, AnyStruct>;
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
declare const object: <S extends Schema>(schema: S) => Struct<InferMarshalled<S>, InferInput<S>, InferOutput<S>, InferPaths<S>, InferOptPaths<S>, "S" | "N" | "B" | "SS" | "NS" | "BS" | "M" | "L" | "NULL" | "BOOL" | "$unknown", false>;

type RecordPaths<S extends AnyStruct> = [string] | [string, ...S['PATHS']];
type RecordOptPaths<S extends AnyStruct> = [string] | [string, ...S['OPT_PATHS']];
declare const record: <S extends AnyStruct>(struct: S) => Struct<Record<string, S["MARSHALLED"]>, Record<string, S["INPUT"]>, Record<string, S["OUTPUT"]>, RecordPaths<S>, RecordOptPaths<S>, "S" | "N" | "B" | "SS" | "NS" | "BS" | "M" | "L" | "NULL" | "BOOL" | "$unknown", false>;

type ArrayPaths<L extends AnyStruct> = [number] | [number, ...L['PATHS']];
type ArrayOptPaths<L extends AnyStruct> = [number] | [number, ...L['OPT_PATHS']];
declare const array: <S extends AnyStruct>(struct: S) => Struct<S["MARSHALLED"][], S["INPUT"][], S["OUTPUT"][], ArrayPaths<S>, ArrayOptPaths<S>, "S" | "N" | "B" | "SS" | "NS" | "BS" | "M" | "L" | "NULL" | "BOOL" | "$unknown", false>;

declare const date: () => Struct<string, Date, Date, [], [], "S" | "N" | "B" | "SS" | "NS" | "BS" | "M" | "L" | "NULL" | "BOOL" | "$unknown", false>;

declare const enums: <T extends string>() => Struct<string, T, T, [], [], "S" | "N" | "B" | "SS" | "NS" | "BS" | "M" | "L" | "NULL" | "BOOL" | "$unknown", false>;

declare const ttl: () => Struct<string, Date, Date, [], [], "S" | "N" | "B" | "SS" | "NS" | "BS" | "M" | "L" | "NULL" | "BOOL" | "$unknown", false>;

declare const unknown: () => Struct<string, unknown, unknown, [], [], "S" | "N" | "B" | "SS" | "NS" | "BS" | "M" | "L" | "NULL" | "BOOL" | "$unknown", false>;

declare class SetStruct<Marshalled, Input extends Set<any>, Output extends Set<any>, Paths extends Array<string | number> = [], OptionalPaths extends Array<string | number> = [], Type extends AttributeTypes = AttributeTypes, Optional extends boolean = false> {
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
    filterIn(value: Input | undefined): boolean;
    filterOut(): boolean;
    marshall(value: Input): Record<Type, Marshalled>;
    unmarshall(value: Record<Type, Marshalled> | undefined): Output;
}

declare const stringSet: () => SetStruct<string[], Set<string>, Set<string>, [], [], "S" | "N" | "B" | "SS" | "NS" | "BS" | "M" | "L" | "NULL" | "BOOL" | "$unknown", false>;

declare const numberSet: () => SetStruct<string[], Set<number>, Set<number>, [], [], "S" | "N" | "B" | "SS" | "NS" | "BS" | "M" | "L" | "NULL" | "BOOL" | "$unknown", false>;

declare const bigintSet: () => SetStruct<string[], Set<bigint>, Set<bigint>, [], [], "S" | "N" | "B" | "SS" | "NS" | "BS" | "M" | "L" | "NULL" | "BOOL" | "$unknown", false>;

declare const binarySet: () => SetStruct<NativeAttributeBinary[], Set<NativeAttributeBinary>, Set<Uint8Array>, [], [], "S" | "N" | "B" | "SS" | "NS" | "BS" | "M" | "L" | "NULL" | "BOOL" | "$unknown", false>;

type StreamData<T extends AnyTableDefinition> = {
    Keys: PrimaryKey<T>;
    OldImage?: InferOutput$1<T>;
    NewImage?: InferOutput$1<T>;
};
type StreamRequest<T extends AnyTableDefinition> = {
    Records: {
        eventName: 'MODIFY' | 'INSERT' | 'REMOVE';
        dynamodb: StreamData<T>;
    }[];
};
type Stream<T extends AnyTableDefinition> = {
    table: T;
    fn: (payload: StreamRequest<T>) => void;
};
declare const streamTable: <T extends AnyTableDefinition>(table: T, fn: (payload: StreamRequest<T>) => void) => Stream<AnyTableDefinition>;

type SeedTable<T extends AnyTableDefinition> = {
    table: T;
    items: InferInput$1<T>[];
};
type Tables = CreateTableCommandInput | CreateTableCommandInput[] | AnyTableDefinition | AnyTableDefinition[];
type StartDynamoDBOptions<T extends Tables> = {
    tables: T;
    stream?: Stream<AnyTableDefinition>[];
    timeout?: number;
    seed?: SeedTable<AnyTableDefinition>[];
};
declare const mockDynamoDB: <T extends Tables>(configOrServer: StartDynamoDBOptions<T> | DynamoDBServer) => DynamoDBServer;

declare const migrate: (client: DynamoDBClient, tables: CreateTableCommandInput | CreateTableCommandInput[] | AnyTableDefinition | AnyTableDefinition[]) => Promise<_aws_sdk_client_dynamodb.CreateTableCommandOutput[]>;

declare const seedTable: <T extends AnyTableDefinition>(table: T, items: InferInput$1<T>[]) => {
    table: T;
    items: InferInput$1<T>[];
};
declare const seed: (defs: ReturnType<typeof seedTable>[]) => Promise<void>;

declare const streamStruct: <T extends AnyTableDefinition>(table: T) => Struct$1<{
    Records: superstruct_dist_utils.Simplify<superstruct_dist_utils.Optionalize<{
        eventName: "REMOVE" | "MODIFY" | "INSERT";
        dynamodb: superstruct_dist_utils.Simplify<superstruct_dist_utils.Optionalize<{
            Keys: PrimaryKey<T, undefined>;
            OldImage: T["schema"]["OUTPUT"] | undefined;
            NewImage: T["schema"]["OUTPUT"] | undefined;
        }>>;
    }>>[];
}, {
    Records: Struct$1<superstruct_dist_utils.Simplify<superstruct_dist_utils.Optionalize<{
        eventName: "REMOVE" | "MODIFY" | "INSERT";
        dynamodb: superstruct_dist_utils.Simplify<superstruct_dist_utils.Optionalize<{
            Keys: PrimaryKey<T, undefined>;
            OldImage: T["schema"]["OUTPUT"] | undefined;
            NewImage: T["schema"]["OUTPUT"] | undefined;
        }>>;
    }>>[], Struct$1<superstruct_dist_utils.Simplify<superstruct_dist_utils.Optionalize<{
        eventName: "REMOVE" | "MODIFY" | "INSERT";
        dynamodb: superstruct_dist_utils.Simplify<superstruct_dist_utils.Optionalize<{
            Keys: PrimaryKey<T, undefined>;
            OldImage: T["schema"]["OUTPUT"] | undefined;
            NewImage: T["schema"]["OUTPUT"] | undefined;
        }>>;
    }>>, {
        eventName: Struct$1<"REMOVE" | "MODIFY" | "INSERT", {
            REMOVE: "REMOVE";
            MODIFY: "MODIFY";
            INSERT: "INSERT";
        }>;
        dynamodb: Struct$1<superstruct_dist_utils.Simplify<superstruct_dist_utils.Optionalize<{
            Keys: PrimaryKey<T, undefined>;
            OldImage: T["schema"]["OUTPUT"] | undefined;
            NewImage: T["schema"]["OUTPUT"] | undefined;
        }>>, {
            Keys: Struct$1<PrimaryKey<T, undefined>, unknown>;
            OldImage: Struct$1<T["schema"]["OUTPUT"] | undefined, unknown>;
            NewImage: Struct$1<T["schema"]["OUTPUT"] | undefined, unknown>;
        }>;
    }>>;
}>;

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

declare const getItem: <T extends AnyTableDefinition, P extends ProjectionExpression<T> | undefined = undefined>(table: T, key: PrimaryKey<T, undefined>, options?: Options & {
    consistentRead?: boolean | undefined;
    projection?: P | undefined;
}) => Promise<ProjectionResponse<T, P> | undefined>;

declare const putItem: <T extends AnyTableDefinition, R extends LimitedReturnValues = "NONE">(table: T, item: T["schema"]["INPUT"], options?: MutateOptions<T, R>) => Promise<ReturnResponse<T, R>>;

type UpdateOptions<T extends AnyTableDefinition, R extends ReturnValues = 'NONE'> = MutateOptions<T, R> & {
    update: (exp: UpdateExpression<T>) => UpdateExpression<T>;
};
declare const updateItem: <T extends AnyTableDefinition, R extends ReturnValues = "NONE">(table: T, key: PrimaryKey<T, undefined>, options: UpdateOptions<T, R>) => Promise<ReturnResponse<T, R>>;

declare const deleteItem: <T extends AnyTableDefinition, R extends LimitedReturnValues = "NONE">(table: T, key: PrimaryKey<T, undefined>, options?: MutateOptions<T, R>) => Promise<ReturnResponse<T, R>>;

declare const getIndexedItem: <T extends AnyTableDefinition, I extends Extract<keyof T["indexes"], string>, P extends ProjectionExpression<T> | undefined = undefined>(table: T, key: PrimaryKey<T, I>, options: Options & {
    index: I;
    projection?: P | undefined;
}) => Promise<ProjectionResponse<T, P> | undefined>;

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

declare const batchPutItem: <T extends AnyTableDefinition>(table: T, items: T["schema"]["INPUT"][], options?: Options) => Promise<void>;

declare const batchDeleteItem: <T extends AnyTableDefinition>(table: T, keys: PrimaryKey<T, undefined>[], options?: Options) => Promise<void>;

type PrimaryKeyNames<T extends AnyTableDefinition, I extends IndexNames<T> | undefined> = (I extends IndexNames<T> ? T['indexes'][I]['sort'] extends string ? T['indexes'][I]['hash'] | T['indexes'][I]['sort'] : T['indexes'][I]['hash'] : T['sort'] extends string ? T['hash'] | T['sort'] : T['hash']);
type InferValue<T extends AnyTableDefinition, P extends PrimaryKeyNames<T, I>, I extends IndexNames<T> | undefined> = T['schema']['INPUT'][P];
declare class KeyCondition<T extends AnyTableDefinition, I extends IndexNames<T> | undefined> extends QueryBulder<T> {
    where<P extends PrimaryKeyNames<T, I>>(path: P): Where<T, P, I>;
    extend<R extends Combine<T, I> | KeyCondition<T, I> | void>(fn: (exp: KeyCondition<T, I>) => R): R;
}
declare class Where<T extends AnyTableDefinition, P extends PrimaryKeyNames<T, I>, I extends IndexNames<T> | undefined> extends QueryBulder<T> {
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
declare class Combine<T extends AnyTableDefinition, I extends IndexNames<T> | undefined> extends QueryBulder<T> {
    get and(): KeyCondition<T, I>;
    get or(): KeyCondition<T, I>;
}

type QueryOptions<T extends AnyTableDefinition, P extends ProjectionExpression<T> | undefined, I extends IndexNames<T> | undefined> = Options & {
    keyCondition: (exp: KeyCondition<T, I>) => Combine<T, I>;
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

type QueryAllOptions<T extends AnyTableDefinition, P extends ProjectionExpression<T> | undefined, I extends IndexNames<T> | undefined> = Options & {
    keyCondition: (exp: KeyCondition<T, I>) => Combine<T, I>;
    projection?: P;
    index?: I;
    consistentRead?: boolean;
    forward?: boolean;
    cursor?: CursorKey<T, I>;
    batch: number;
};
declare const queryAll: <T extends AnyTableDefinition, P extends ProjectionExpression<T> | undefined, I extends Extract<keyof T["indexes"], string> | undefined>(table: T, options: QueryAllOptions<T, P, I>) => Generator<Promise<ProjectionResponse<T, P>[]>, any, unknown>;

type ScanAllOptions<T extends AnyTableDefinition, P extends ProjectionExpression<T> | undefined> = Options & {
    projection?: P;
    consistentRead?: boolean;
    batch: number;
    cursor?: CursorKey<T>;
};
declare const scanAll: <T extends AnyTableDefinition, P extends ProjectionExpression<T> | undefined>(table: T, options: ScanAllOptions<T, P>) => Generator<Promise<ProjectionResponse<T, P>[]>, any, unknown>;

type PaginateQueryOptions<T extends AnyTableDefinition, P extends ProjectionExpression<T> | undefined, I extends IndexNames<T> | undefined> = Options & {
    keyCondition: (exp: KeyCondition<T, I>) => Combine<T, I>;
    projection?: P;
    index?: I;
    consistentRead?: boolean;
    forward?: boolean;
    limit?: number;
    cursor?: string;
};
type PaginateQueryResponse<T extends AnyTableDefinition, P extends ProjectionExpression<T> | undefined> = {
    count: number;
    items: ProjectionResponse<T, P>[];
    cursor?: string;
};
declare const paginateQuery: <T extends AnyTableDefinition, P extends ProjectionExpression<T> | undefined = undefined, I extends Extract<keyof T["indexes"], string> | undefined = undefined>(table: T, options: PaginateQueryOptions<T, P, I>) => Promise<PaginateQueryResponse<T, P>>;

type PaginateScanOptions<T extends AnyTableDefinition, P extends ProjectionExpression<T> | undefined, I extends IndexNames<T> | undefined> = Options & {
    projection?: P;
    index?: I;
    consistentRead?: boolean;
    limit?: number;
    cursor?: string;
};
type PaginateScanResponse<T extends AnyTableDefinition, P extends ProjectionExpression<T> | undefined> = {
    count: number;
    items: ProjectionResponse<T, P>[];
    cursor?: string;
};
declare const paginateScan: <T extends AnyTableDefinition, P extends ProjectionExpression<T> | undefined = undefined, I extends Extract<keyof T["indexes"], string> | undefined = undefined>(table: T, options?: PaginateScanOptions<T, P, I>) => Promise<PaginateScanResponse<T, P>>;

export { CursorKey, HashKey, InferInput$1 as InferInput, InferOutput$1 as InferOutput, PrimaryKey, SortKey, TableDefinition, TransactConditionCheck, TransactDelete, TransactPut, TransactUpdate, Transactable, any, array, batchDeleteItem, batchGetItem, batchPutItem, bigfloat, bigint, bigintSet, binary, binarySet, boolean, date, define, deleteItem, dynamoDBClient, dynamoDBDocumentClient, enums, getIndexedItem, getItem, migrate, mockDynamoDB, number, numberSet, object, optional, paginateQuery, paginateScan, putItem, query, queryAll, record, scan, scanAll, seed, seedTable, streamStruct, streamTable, string, stringSet, transactConditionCheck, transactDelete, transactPut, transactUpdate, transactWrite, ttl, unknown, updateItem, uuid };
