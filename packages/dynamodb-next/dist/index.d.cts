import { NativeAttributeBinary, marshallOptions, unmarshallOptions } from '@aws-sdk/util-dynamodb';
import * as _aws_sdk_client_dynamodb from '@aws-sdk/client-dynamodb';
import { AttributeValue, DynamoDBClient, TransactWriteItem, CreateTableCommandInput, UpdateItemCommandInput, TransactGetItem } from '@aws-sdk/client-dynamodb';
export { BatchGetItemCommand, BatchWriteItemCommand, ConditionalCheckFailedException, DeleteItemCommand, DynamoDBClient, GetItemCommand, PutItemCommand, QueryCommand, ScanCommand, TransactGetItemsCommand, TransactWriteItemsCommand, TransactionCanceledException, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { UUID } from 'node:crypto';
import { BigFloat } from '@awsless/big-float';
import { DynamoDBServer } from '@awsless/dynamodb-server';
export { DynamoDBServer } from '@awsless/dynamodb-server';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
export { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

type AnySchema$1 = BaseSchema<any>;
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
type AttributeType = keyof MarshallInputTypes;
type AttributeInputValue<T extends AttributeType = AttributeType> = MarshallInputTypes[T];
type AttributeOutputValue<T extends AttributeType = AttributeType> = MarshallOutputTypes[T];
type AttributeInput<T extends AttributeType = AttributeType> = Record<T, AttributeInputValue<T>>;
type AttributeOutput<T extends AttributeType = AttributeType> = Record<T, AttributeOutputValue<T>>;
type Expression<U = any, C = any, RU = any, RC = any> = {
    Update: U;
    Condition: C;
    Root: {
        Update: RU;
        Condition: RC;
    };
};
type BaseSchema<A extends AttributeType, T = any, Exp extends Expression = Expression> = {
    [key: symbol]: {
        Type: T;
        Expression: Exp;
    };
    readonly type?: A;
    encode(value: T): AttributeInputValue<A> | undefined;
    decode(value: AttributeOutputValue<A>): T;
    marshall(value: T): AttributeInput<A> | undefined;
    unmarshall(value: AttributeOutput<A>): T;
    filterIn(value: T | undefined): boolean;
    filterOut(value: T | undefined): boolean;
    walk?(...path: Array<string | number>): AnySchema$1 | undefined;
};

type AnyMapSchema = BaseSchema<'M'>;
type Infer<T extends AnyTable> = T['schema'][symbol]['Type'];
type AnyTable<T extends AnyMapSchema = AnyMapSchema> = Table<T, any, any, any>;
type IndexNames<T extends AnyTable> = Extract<keyof T['indexes'], string>;
type TableIndex<Schema extends AnyMapSchema> = {
    hash: Extract<keyof Schema[symbol]['Type'], string>;
    sort?: Extract<keyof Schema[symbol]['Type'], string> | undefined;
};
type TableIndexes<Schema extends AnyMapSchema> = Record<string, TableIndex<Schema>>;
declare class Table<Schema extends AnyMapSchema, Hash extends Extract<keyof Schema[symbol]['Type'], string>, Sort extends Extract<keyof Schema[symbol]['Type'], string> | undefined, Indexes extends TableIndexes<Schema> | undefined> {
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
    walk(...path: Array<string | number>): AnySchema$1 | Schema;
    marshall(item: Partial<Schema[symbol]['Type']>): Record<string, AttributeValue>;
    unmarshall(item: any): Schema[symbol]['Type'];
}
declare const define: <Schema extends AnyMapSchema, Hash extends Extract<keyof Schema[symbol]["Type"], string>, Sort extends Extract<keyof Schema[symbol]["Type"], string> | undefined, Indexes extends TableIndexes<Schema> | undefined>(name: string, options: {
    hash: Hash;
    sort?: Sort;
    schema: Schema;
    indexes?: Indexes;
}) => Table<Schema, Hash, Sort, Indexes>;

type Key<T extends AnyTable, K extends keyof Infer<T>> = Required<Record<K, Infer<T>[K]>>;
type HashKey<T extends AnyTable, I extends IndexNames<T> | undefined = undefined> = I extends IndexNames<T> ? Key<T, T['indexes'][I]['hash']> : Key<T, T['hash']>;
type SortKey<T extends AnyTable, I extends IndexNames<T> | undefined = undefined> = I extends IndexNames<T> ? T['indexes'][I]['sort'] extends string ? Key<T, T['indexes'][I]['sort']> : {} : T['sort'] extends string ? Key<T, T['sort']> : {};
type PrimaryKey<T extends AnyTable, I extends IndexNames<T> | undefined = undefined> = HashKey<T, I> & SortKey<T, I>;
type QueryKey<T extends AnyTable, I extends IndexNames<T> | undefined = undefined> = HashKey<T, I> & Partial<SortKey<T, I>>;

interface Options {
    client?: DynamoDBClient;
}

type Transactable$1 = {
    transact(): TransactWriteItem;
};
type TransactWriteOptions$1 = Options & {
    idempotantKey?: string;
};
declare const transactWrite: (items: Transactable$1[], options?: TransactWriteOptions$1) => Promise<void>;

type ExpressionAttributeNames = Record<string, string>;
type ExpressionAttributeValues = Record<string, AttributeValue>;

declare const secret: unique symbol;
declare class Fluent extends Function {
    readonly [secret]: any[];
}
declare const createFluent: () => any;

type BaseConditionExpression<A extends AttributeType, T> = Path<A, any> & EqualFunction<A, T> & NotEqualFunction<A, T> & ExistsFunction & NotExistsFunction & TypeFunction<A>;
type RootConditionExpression<R extends Record<string, any>> = {
    at<K extends keyof R>(key: K): R[K];
} & AndFunction & OrFunction & NotFunction & SizeFunction & R;
type MapConditionExpression<T, R extends Record<string, any>> = {
    at<K extends keyof R>(key: K): R[K];
} & BaseConditionExpression<'M', T> & R;
type ListConditionExpression<T, L extends any[]> = {
    at<K extends number>(key: K): L[K];
} & BaseConditionExpression<'L', T> & ContainsFunction<'L', T>;
type TupleWithRestConditionExpression<T extends any[], L extends any[], R> = {
    at<K extends number>(index: K): L[K] extends undefined ? R : L[K];
} & BaseConditionExpression<'L', T> & ContainsFunction<'L', T>;
type SetConditionExpression<A extends AttributeType, T> = BaseConditionExpression<A, T> & ContainsFunction<A, T>;
type StringConditionExpression<T> = BaseConditionExpression<'S', T> & StartsWithFunction & ContainsFunction<'S', string> & InFunction<'S', T>;
type JsonConditionExpression<T> = BaseConditionExpression<'S', T>;
type NumberConditionExpression<T> = BaseConditionExpression<'N', T> & GreaterThanFunction<T> & GreaterThanOrEqualFunction<T> & LessThanFunction<T> & LessThanOrEqualFunction<T> & BetweenFunction<T> & InFunction<'N', T>;
type BinaryConditionExpression<T> = BaseConditionExpression<'B', T> & InFunction<'B', T>;
type BooleanConditionExpression<T> = BaseConditionExpression<'BOOL', T>;
type UnknownConditionExpression<T> = BaseConditionExpression<AttributeType, T>;
type ConditionExpression<T extends AnyTable> = (e: T['schema'][symbol]['Expression']['Root']['Condition']) => Fluent | Fluent[];

type BaseUpdateExpression<A extends AttributeType, T> = Path<A, T> & SetFunction<A, T> & SetIfNotExistFunction<A, T> & DeleteFunction<T>;
type RootUpdateExpression<T, R extends Record<string, any>> = {
    at<K extends keyof R>(key: K): R[K];
} & R & SetPartialFunction<'M', Partial<T>>;
type MapUpdateExpression<T, R extends Record<string, any>> = {
    at<K extends keyof R>(key: K): R[K];
} & R & BaseUpdateExpression<'M', T> & SetPartialFunction<'M', T>;
type ListUpdateExpression<T extends any[], L extends any[]> = {
    at<K extends keyof L>(index: K): L[K];
} & BaseUpdateExpression<'L', T> & PushFunction<T>;
type TupleUpdateExpression<T extends any[], L extends any[]> = {
    at<K extends keyof L>(index: K): L[K];
} & BaseUpdateExpression<'L', T>;
type TupleWithRestUpdateExpression<T extends any[], L extends any[], R> = {
    at<K extends number>(index: K): L[K] extends undefined ? R : L[K];
} & BaseUpdateExpression<'L', T>;
type SetUpdateExpression<A extends AttributeType, T> = BaseUpdateExpression<A, T> & AppendFunction<A, T> & RemoveFunction<A, T>;
type UnknownUpdateExpression<T> = BaseUpdateExpression<AttributeType, T>;
type BooleanUpdateExpression<T> = BaseUpdateExpression<'BOOL', T>;
type BinaryUpdateExpression<T> = BaseUpdateExpression<'B', T>;
type StringUpdateExpression<T> = BaseUpdateExpression<'S', T>;
type NumberUpdateExpression<T> = BaseUpdateExpression<'N', T> & IncrementFunction<T> & DecrementFunction<T>;
type UpdateExpression<T extends AnyTable> = (e: T['schema'][symbol]['Expression']['Root']['Update']) => Fluent | Fluent[];

declare const $path: unique symbol;
type Path<A extends AttributeType, T = any> = {
    [$path]: [A, T];
};
type SetFunction<A extends AttributeType, T> = {
    /**
     * Set the attribute to the provided value.
     * @param value - The value to assign to the attribute.
     */
    set(value: T): Fluent;
    set(value: Path<A, T>): Fluent;
};
type SetPartialFunction<A extends AttributeType, T> = {
    /**
     * Partially update the object fields with the provided value.
     *
     * Unlike {@link SetFunction.set}, which replaces the entire attribute,
     * this method allows updating only a subset of the object fields.
     *
     * @param value - A partial object containing the fields to update.
     */
    setPartial(value: Partial<T>): Fluent;
    setPartial(value: Path<A, T>): Fluent;
};
type SetIfNotExistFunction<A extends AttributeType, T> = {
    /**
     * Set the attribute value only if it does not already exist.
     * @param value - The value to assign if the attribute is currently undefined.
     */
    setIfNotExists(value: T): Fluent;
    setIfNotExists(value: Path<A, T>): Fluent;
};
type DeleteFunction<T> = undefined extends T ? {
    /** Delete attribute value. */
    delete(): Fluent;
} : {};
type PushFunction<T extends any[] | undefined, I = NonNullable<T>[number]> = {
    /**
     * Push one or more elements to the end of the array.
     * @param {...NonNullable<T>} values - The elements to append to the array.
     */
    push(...values: [I, ...I[]]): Fluent;
    push(...values: [Path<AttributeType, I> | I, ...(Path<AttributeType, I> | I)[]]): Fluent;
};
type IncrementFunction<T, V = NonNullable<T>> = {
    /**
     * Increment a numeric value.
     * @param {V} value - The amount to increment by.
     * @param {V} defaultValue - Default value for when the attribute doesn't exist.
     */
    incr(value: V, defaultValue?: V): Fluent;
    incr(value: Path<'N'> | V, defaultValue?: Path<'N'> | V): Fluent;
};
type DecrementFunction<T, V = NonNullable<T>> = {
    /**
     * Decrement a numeric value.
     * @param {V} value - The amount to decrement by.
     * @param {V} defaultValue - Default value for when the attribute doesn't exist.
     */
    decr(value: V, defaultValue?: V): Fluent;
    decr(value: Path<'N'> | V, defaultValue?: Path<'N'> | V): Fluent;
};
type AppendFunction<A extends AttributeType, T, V = NonNullable<T>> = {
    /**
     * Append elements to a Set.
     * @param {V} value - The elements to add to the Set.
     */
    append(value: V): Fluent;
    append(value: Path<A, T>): Fluent;
};
type RemoveFunction<A extends AttributeType, T, V = NonNullable<T>> = {
    /**
     * Remove elements from a Set.
     * @param {V} value - The elements to remove to the Set.
     */
    remove(value: V): Fluent;
    remove(value: Path<A, T>): Fluent;
};
type AndFunction = {
    /**
     * Check if all inner conditions evaluate to `true`.
     * @param conditions - An array of condition expressions.
     */
    and(conditions: Fluent[]): Fluent;
};
type OrFunction = {
    /**
     * Check if at least one inner condition evaluates to `true`.
     * @param conditions - An array of condition expressions.
     */
    or(conditions: Fluent[]): Fluent;
};
type NotFunction = {
    /**
     * Check if the given condition evaluates to `false`.
     * @param condition - A single condition expression to negate.
     */
    not(condition: Fluent): Fluent;
};
type SizeFunction = {
    /**
     * Evaluates the size (length or item count) of the given attribute.
     *
     * Works with the following attribute types:
     * - `'S'` (String): Returns the number of UTF-8 bytes in the string.
     * - `'B'` (Binary): Returns the number of bytes.
     * - `'L'` (List): Returns the number of elements in the list.
     * - `'M'` (Map): Returns the number of top-level keys.
     * - `'SS'` (String Set), `'NS'` (Number Set), `'BS'` (Binary Set): Returns the number of elements in the set.
     *
     * @param path - A reference to the attribute whose size should be evaluated.
     */
    size(path: Path<'S' | 'B' | 'L' | 'M' | 'SS' | 'NS' | 'BS', any>): NumberConditionExpression<number>;
};
type EqualFunction<A extends AttributeType, T> = {
    /**
     * Check if the attribute is equal to the specified value or another attribute.
     * @param value - A literal value or reference to another attribute.
     */
    eq(value: T): Fluent;
    eq(value: Path<A>): Fluent;
};
type NotEqualFunction<A extends AttributeType, T> = {
    /**
     * Check if the attribute is not equal to the specified value or another attribute.
     * @param value - A literal value or reference to another attribute.
     */
    nq(value: T): Fluent;
    nq(value: Path<A>): Fluent;
};
type GreaterThanFunction<T, V = NonNullable<T>> = {
    /**
     * Check if the attribute is greater than the specified value or another attribute.
     * @param value - A literal value or reference to another attribute.
     */
    gt(value: V): Fluent;
    gt(value: Path<'N'>): Fluent;
};
type GreaterThanOrEqualFunction<T, V = NonNullable<T>> = {
    /**
     * Check if the attribute is greater than or equal to the specified value or another attribute.
     * @param value - A literal value or reference to another attribute.
     */
    gte(value: V): Fluent;
    gte(value: Path<'N'>): Fluent;
};
type LessThanFunction<T, V = NonNullable<T>> = {
    /**
     * Check if the attribute is less than the specified value or another attribute.
     * @param value - A literal value or reference to another attribute.
     */
    lt(value: V): Fluent;
    lt(value: Path<'N'>): Fluent;
};
type LessThanOrEqualFunction<T, V = NonNullable<T>> = {
    /**
     * Check if the attribute is less than or equal to the specified value or another attribute.
     * @param value - A literal value or reference to another attribute.
     */
    lte(value: V): Fluent;
    lte(value: Path<'N'>): Fluent;
};
type BetweenFunction<T, V = NonNullable<T>> = {
    /**
     * Check if the attribute is between two values, inclusive.
     * @param min - The lower bound (inclusive), can be a value or attribute reference.
     * @param max - The upper bound (inclusive), can be a value or attribute reference.
     */
    between(min: V, max: V): Fluent;
    between(min: V | Path<'N'>, max: V | Path<'N'>): Fluent;
};
type InFunction<A extends AttributeType, T, V = NonNullable<T>> = {
    /**
     * Check if the attribute is equal to any value in the specified list.
     * Can contain up to 100 values.
     * @param values - A non-empty list of values or attribute references to compare against.
     */
    in(values: [V, ...V[]]): Fluent;
    in(values: [V | Path<A>, ...(V | Path<A>)[]]): Fluent;
};
type StartsWithFunction = {
    /**
     * Check if the attribute begins with the specified substring or attribute value.
     * @param search - A string prefix or another attribute.
     */
    startsWith(search: string): Fluent;
    startsWith(search: Path<'S'>): Fluent;
};
type ContainsFunction<A extends AttributeType, T, V = NonNullable<T>> = {
    /**
     * Check if the attribute contains the specified value.
     * Works for:
     * - string - checks if a substring is present.
     * - array - checks if an element exists in the list.
     * - set - checks if an element exists in the set.
     * @param value - The value or attribute to search for.
     */
    contains(value: V): Fluent;
    contains(value: Path<A>): Fluent;
};
type ExistsFunction = {
    /**
     * Check if the attribute exists.
     */
    exists(): Fluent;
};
type NotExistsFunction = {
    /**
     * Check if the attribute does not exist.
     */
    notExists(): Fluent;
};
type TypeFunction<A extends AttributeType> = {
    /**
     * Check if the attribute is of the specified DynamoDB type.
     * @param value - The expected DynamoDB type, such as `"S"`, `"N"`, `"BOOL"`, etc.
     */
    type(value: A): Fluent;
};
type StringExpression<T> = Expression<StringUpdateExpression<T>, StringConditionExpression<T>>;
type NumberExpression<T> = Expression<NumberUpdateExpression<T>, NumberConditionExpression<T>>;
type BooleanExpression<T> = Expression<BooleanUpdateExpression<T>, BooleanConditionExpression<T>>;
type BinaryExpression<T> = Expression<BinaryUpdateExpression<T>, BinaryConditionExpression<T>>;
type JsonExpression<T> = Expression<StringUpdateExpression<T>, JsonConditionExpression<T>>;
type MapExpression<T, P extends Record<string, AnySchema$1>, P_UPDATE extends Record<string, any> = {
    [K in keyof P]: P[K][symbol]['Expression']['Update'];
}, P_CONDITION extends Record<string, any> = {
    [K in keyof P]: P[K][symbol]['Expression']['Condition'];
}> = Expression<MapUpdateExpression<T, P_UPDATE>, MapConditionExpression<T, P_CONDITION>, RootUpdateExpression<T, P_UPDATE>, RootConditionExpression<P_CONDITION>>;
type ListExpression<T extends any[], L extends AnySchema$1[]> = Expression<ListUpdateExpression<T, {
    [K in keyof L]: L[K][symbol]['Expression']['Update'];
}>, ListConditionExpression<T, {
    [K in keyof L]: L[K][symbol]['Expression']['Condition'];
}>>;
type TupleExpression<T extends any[], L extends AnySchema$1[]> = Expression<TupleUpdateExpression<T, {
    [K in keyof L]: L[K][symbol]['Expression']['Update'];
}>, ListConditionExpression<T, {
    [K in keyof L]: L[K][symbol]['Expression']['Condition'];
}>>;
type TupleWithRestExpression<T extends any[], L extends AnySchema$1[], R extends AnySchema$1> = Expression<TupleWithRestUpdateExpression<T, {
    [K in keyof L]: L[K][symbol]['Expression']['Update'];
}, R[symbol]['Expression']['Update']>, TupleWithRestConditionExpression<T, {
    [K in keyof L]: L[K][symbol]['Expression']['Condition'];
}, R[symbol]['Expression']['Condition']>>;
type SetExpression<A extends AttributeType, T> = Expression<SetUpdateExpression<A, T>, SetConditionExpression<A, T>>;
type UnknownExpression<T> = Expression<UnknownUpdateExpression<T>, UnknownConditionExpression<T>>;
type EnumExpression<T> = Expression<UnknownUpdateExpression<T>, UnknownConditionExpression<T>>;

type OptionalSchema<T extends AnySchema$1> = BaseSchema<T['type'], T[symbol]['Type'] | undefined, 'S' extends T['type'] ? StringExpression<T[symbol]['Type'] | undefined> : 'N' extends T['type'] ? NumberExpression<T[symbol]['Type'] | undefined> : 'BOOL' extends T['type'] ? BooleanExpression<T[symbol]['Type'] | undefined> : 'B' extends T['type'] ? BinaryExpression<T[symbol]['Type'] | undefined> : 'SS' | 'NS' | 'BN' extends T['type'] ? SetExpression<T['type'], T[symbol]['Type'] | undefined> : T[symbol]['Expression']>;
declare const optional: <T extends AnySchema$1>(schema: T) => OptionalSchema<T>;

type UnknownOptions = {
    marshall?: marshallOptions;
    unmarshall?: unmarshallOptions;
};
type UnknownSchema = BaseSchema<AttributeType, unknown, UnknownExpression<unknown>>;
declare const unknown: (opts?: UnknownOptions) => UnknownSchema;

type AnySchema = BaseSchema<AttributeType, any, UnknownExpression<any>>;
declare const any: (opts?: UnknownOptions) => AnySchema;

type AllowedSchema = BaseSchema<'S'> | BaseSchema<'N'> | BaseSchema<'B'>;
type SetSchema<T extends AllowedSchema> = BaseSchema<`${NonNullable<T['type']>}S`, Set<T[symbol]['Type']>, SetExpression<`${NonNullable<T['type']>}S`, Set<T[symbol]['Type']>>>;
declare const set: <S extends AllowedSchema>(schema: S) => SetSchema<S>;

type UuidSchema = BaseSchema<'S', UUID, StringExpression<UUID>>;
declare const uuid: () => UuidSchema;

type StringSchema<T extends string = string> = BaseSchema<'S', T, StringExpression<T>>;
declare function string(): StringSchema;
declare function string<T extends string>(): StringSchema<T>;

type BooleanSchema<T extends boolean = boolean> = BaseSchema<'BOOL', T, BooleanExpression<T>>;
declare const boolean: () => BooleanSchema;

type NumberSchema<T extends number = number> = BaseSchema<'N', T, NumberExpression<T>>;
declare function number(): NumberSchema;
declare function number<T extends number>(): NumberSchema<T>;

type BigIntSchema<T extends bigint = bigint> = BaseSchema<'N', T, NumberExpression<T>>;
declare function bigint(): BigIntSchema;
declare function bigint<T extends bigint>(): BigIntSchema<T>;

type BigFloatSchema = BaseSchema<'N', BigFloat, NumberExpression<BigFloat>>;
declare const bigfloat: () => BigFloatSchema;

type Uint8ArraySchema = BaseSchema<'B', Uint8Array, BinaryExpression<Uint8Array>>;
declare const uint8array: () => Uint8ArraySchema;

type Properties = Record<string, AnySchema$1>;
type KeyOf<S> = Extract<keyof S, string>;
type IsOptional<T extends AnySchema$1> = undefined extends T[symbol]['Type'] ? true : false;
type FilterOptional<S extends Properties> = {
    [K in KeyOf<S> as IsOptional<S[K]> extends true ? K : never]?: S[K];
};
type FilterRequired<S extends Properties> = {
    [K in KeyOf<S> as IsOptional<S[K]> extends true ? never : K]: S[K];
};
type Optinalize<S extends Properties> = FilterOptional<S> & FilterRequired<S>;
type InferProps<S extends Properties> = {
    [K in keyof Optinalize<S>]: S[K][symbol]['Type'];
};
type ObjectSchema<T, P extends Properties> = BaseSchema<'M', T, MapExpression<T, P>>;
declare const object: <P extends Properties>(props: P) => ObjectSchema<InferProps<P>, P>;

type RecordSchema<S extends AnySchema$1> = BaseSchema<'M', Record<string, S[symbol]['Type']>, MapExpression<Record<string, S[symbol]['Type']>, Record<string, S>>>;
declare const record: <S extends AnySchema$1>(schema: S) => RecordSchema<S>;

type ArraySchema<T extends AnySchema$1> = BaseSchema<'L', T[symbol]['Type'][], ListExpression<T[symbol]['Type'][], T[]>>;
declare const array: <S extends AnySchema$1>(schema: S) => ArraySchema<S>;

type Tuple<Entries extends AnySchema$1[]> = {
    -readonly [Key in keyof Entries]: Entries[Key][symbol]['Type'];
};
type TupleSchema<T extends any[], L extends AnySchema$1[]> = BaseSchema<'L', T, TupleExpression<T, L>>;
type TupleWithRestSchema<T extends any[], L extends AnySchema$1[], R extends AnySchema$1> = BaseSchema<'L', T, TupleWithRestExpression<T, L, R>>;
declare function tuple<const T extends AnySchema$1[]>(entries: T): TupleSchema<Tuple<T>, T>;
declare function tuple<const T extends AnySchema$1[], const R extends AnySchema$1>(entries: T, rest: R): TupleWithRestSchema<[...Tuple<T>, ...Tuple<R[]>], T, R>;

type DateSchema = BaseSchema<'N', Date, NumberExpression<Date>>;
declare const date: () => DateSchema;

type Enum = Record<string, string | number>;
type EnumSchema<T extends Enum> = BaseSchema<'N' | 'S', T[keyof T], EnumExpression<T[keyof T]>>;
declare function enum_<T extends Enum>(_: T): EnumSchema<T>;

type JsonSchema<T> = BaseSchema<'S', T, JsonExpression<T>>;
declare const json: <T = unknown>() => JsonSchema<T>;

type TtlSchema = BaseSchema<'N', Date, NumberExpression<Date>>;
declare const ttl: () => TtlSchema;

type StreamData<T extends AnyTable> = {
    Keys: PrimaryKey<T>;
    OldImage?: Infer<T>;
    NewImage?: Infer<T>;
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
    items: Infer<T>[];
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

declare const seedTable: <T extends AnyTable>(table: T, items: Infer<T>[]) => {
    table: T;
    items: Infer<T>[];
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

type Code = 'ConditionalCheckFailed' | 'TransactionConflict';
declare module '@aws-sdk/client-dynamodb' {
    interface TransactionCanceledException {
        cancellationReasonAt: (index: number) => Code | undefined;
        conditionFailedAt: (index: number) => boolean;
        conflictAt: (index: number) => boolean;
    }
}

type FilterByProjection<T extends AnyTable, P extends ProjectionExpression<T>> = {
    [K in keyof Infer<T> & P[keyof P]]: Infer<T>[K];
};
type ProjectionExpression<T extends AnyTable> = Array<Extract<keyof Infer<T>, string>>;
type ProjectionResponse<T extends AnyTable, P extends ProjectionExpression<T> | undefined> = undefined extends P ? Infer<T> : P extends ProjectionExpression<T> ? FilterByProjection<T, P> : Infer<T>;

declare const getItem: <T extends AnyTable, const P extends ProjectionExpression<T> | undefined>(table: T, key: PrimaryKey<T>, options?: Options & {
    consistentRead?: boolean;
    select?: P;
}) => {
    then<Result1 = ProjectionResponse<T, P> | undefined, Result2 = never>(onfulfilled: (value: ProjectionResponse<T, P> | undefined) => Result1, onrejected?: ((reason: any) => Result2) | undefined): Promise<Result1 | Result2>;
    transact: () => {
        unmarshall: (item: Record<string, AttributeValue>) => ProjectionResponse<T, P>;
        input: {
            Get: _aws_sdk_client_dynamodb.GetItemCommandInput;
        };
    };
};

type UpdateReturnValue = 'NONE' | 'ALL_OLD' | 'UPDATED_OLD' | 'ALL_NEW' | 'UPDATED_NEW';
type ReturnValue = 'NONE' | 'ALL_OLD';
type UpdateReturnResponse<T extends AnyTable, R extends UpdateReturnValue> = UpdateReturnValue extends R ? void : R extends 'NONE' ? void : R extends 'ALL_NEW' ? Infer<T> : R extends 'ALL_OLD' ? Infer<T> | undefined : R extends 'UPDATED_NEW' ? Partial<Infer<T>> : Partial<Infer<T>> | undefined;
type ReturnResponse<T extends AnyTable, R extends ReturnValue> = ReturnValue extends R ? void : R extends 'NONE' ? void : Infer<T> | undefined;

declare const putItem: <T extends AnyTable, R extends ReturnValue>(table: T, item: Infer<T>, options?: Options & {
    return?: R;
    when?: ConditionExpression<T>;
}) => {
    then<Result1 = ReturnResponse<T, R>, Result2 = never>(onfulfilled: (value: ReturnResponse<T, R>) => Result1, onrejected?: ((reason: any) => Result2) | undefined): Promise<Result1 | Result2>;
    transact: () => {
        Put: _aws_sdk_client_dynamodb.PutItemCommandInput;
    };
};

type UpdateOptions<T extends AnyTable, R extends UpdateReturnValue> = Options & {
    update: UpdateExpression<T>;
    when?: ConditionExpression<T>;
    return?: R;
};
declare const updateItem: <T extends AnyTable, R extends UpdateReturnValue>(table: T, key: PrimaryKey<T>, options: UpdateOptions<T, R>) => {
    then<Result1 = UpdateReturnResponse<T, R>, Result2 = never>(onfulfilled: (value: UpdateReturnResponse<T, R>) => Result1, onrejected?: ((reason: any) => Result2) | undefined): Promise<Result1 | Result2>;
    transact: () => {
        Update: UpdateItemCommandInput & {
            UpdateExpression: string;
        };
    };
};

declare const deleteItem: <T extends AnyTable, R extends ReturnValue>(table: T, key: PrimaryKey<T>, options?: Options & {
    return?: R;
    when?: ConditionExpression<T>;
}) => {
    then<Result1 = ReturnResponse<T, R>, Result2 = never>(onfulfilled: (value: ReturnResponse<T, R>) => Result1, onrejected?: ((reason: any) => Result2) | undefined): Promise<Result1 | Result2>;
    transact: () => {
        Delete: _aws_sdk_client_dynamodb.DeleteItemCommandInput;
    };
};

type Thenable<T> = {
    then<Result1 = T, Result2 = never>(onfulfilled: (value: T) => Result1, onrejected?: (reason: any) => Result2): Promise<Result1 | Result2>;
};

type BatchGetOptions<T extends AnyTable, P extends ProjectionExpression<T> | undefined, F extends boolean> = Options & {
    select?: P;
    consistentRead?: boolean;
    filterNonExistentItems?: F;
};
type BatchGetItem = {
    <T extends AnyTable, P extends ProjectionExpression<T> | undefined>(table: T, keys: PrimaryKey<T>[], options?: BatchGetOptions<T, P, false>): Thenable<(ProjectionResponse<T, P> | undefined)[]>;
    <T extends AnyTable, P extends ProjectionExpression<T> | undefined>(table: T, keys: PrimaryKey<T>[], options?: BatchGetOptions<T, P, true>): Thenable<ProjectionResponse<T, P>[]>;
};
declare const getItems: BatchGetItem;

declare const putItems: <T extends AnyTable>(table: T, items: Infer<T>[], options?: Options) => Thenable<void>;

declare const deleteItems: <T extends AnyTable>(table: T, keys: PrimaryKey<T>[], options?: Options) => Thenable<void>;

declare const getIndexItem: <T extends AnyTable, I extends IndexNames<T>, const P extends ProjectionExpression<T> | undefined = undefined>(table: T, index: I, key: PrimaryKey<T, I>, options?: Options & {
    select?: P;
}) => Thenable<ProjectionResponse<T, P> | undefined>;

type KeyConditionExpression<T extends AnyTable, I extends IndexNames<T> | undefined> = (e: Pick<T['schema'][symbol]['Expression']['Root']['Condition'], I extends IndexNames<T> ? T['indexes'][I]['sort'] : T['sort']>) => Fluent | Fluent[];

type QueryOptions<T extends AnyTable, P extends ProjectionExpression<T> | undefined, I extends IndexNames<T> | undefined> = Options & {
    where?: KeyConditionExpression<T, I>;
    select?: P;
    index?: I;
    consistentRead?: boolean;
    order?: 'asc' | 'desc';
    limit?: number;
    cursor?: string;
    disablePreciseCursor?: boolean;
};
type QueryResponse<T extends AnyTable, P extends ProjectionExpression<T> | undefined> = {
    items: ProjectionResponse<T, P>[];
    cursor?: string;
};
declare const query: <T extends AnyTable, const P extends ProjectionExpression<T> | undefined = undefined, I extends IndexNames<T> | undefined = undefined>(table: T, key: QueryKey<T, I>, options?: QueryOptions<T, P, I>) => {
    then<Result1 = QueryResponse<T, P>, Result2 = never>(onfulfilled: (value: QueryResponse<T, P>) => Result1, onrejected?: ((reason: any) => Result2) | undefined): Promise<Result1 | Result2>;
    [Symbol.asyncIterator](): {
        next(): Promise<{
            done: true;
        } | {
            done: false;
            value: ProjectionResponse<T, P>[];
        }>;
    };
};

type ScanOptions<T extends AnyTable, P extends ProjectionExpression<T> | undefined, I extends IndexNames<T> | undefined> = Options & {
    select?: P;
    index?: I;
    consistentRead?: boolean;
    limit?: number;
    cursor?: string;
    disablePreciseCursor?: boolean;
};
type ScanResponse<T extends AnyTable, P extends ProjectionExpression<T> | undefined> = {
    items: ProjectionResponse<T, P>[];
    cursor?: string;
};
declare const scan: <T extends AnyTable, const P extends ProjectionExpression<T> | undefined = undefined, I extends IndexNames<T> | undefined = undefined>(table: T, options?: ScanOptions<T, P, I>) => {
    then<Result1 = ScanResponse<T, P>, Result2 = never>(onfulfilled: (value: ScanResponse<T, P>) => Result1, onrejected?: ((reason: any) => Result2) | undefined): Promise<Result1 | Result2>;
    [Symbol.asyncIterator](): {
        next(): Promise<{
            done: true;
        } | {
            done: false;
            value: ProjectionResponse<T, P>[];
        }>;
    };
};

declare const conditionCheck: <T extends AnyTable>(table: T, key: PrimaryKey<T>, options: {
    when: ConditionExpression<T>;
}) => {
    transact: () => {
        ConditionCheck: {
            ExpressionAttributeValues?: ExpressionAttributeValues;
            ExpressionAttributeNames?: ExpressionAttributeNames;
            TableName: string;
            Key: Record<string, _aws_sdk_client_dynamodb.AttributeValue>;
            ConditionExpression: string;
        };
    };
};

type Transactable = {
    transact(): {
        input: TransactGetItem;
        unmarshall(item: Record<string, AttributeValue>): any;
    };
};
type TransactReadResponse<T extends Transactable[]> = {
    [K in keyof T]: ReturnType<ReturnType<T[K]['transact']>['unmarshall']> | undefined;
};
type TransactWriteOptions = Options;
declare const transactRead: <const T extends Transactable[]>(items: T, options?: TransactWriteOptions) => Promise<TransactReadResponse<T>>;

export { type AnyTable, Fluent, type HashKey, type Infer, type PrimaryKey, type SortKey, Table, type Transactable$1 as Transactable, any, array, bigfloat, bigint, boolean, conditionCheck, createFluent, date, define, deleteItem, deleteItems, dynamoDBClient, dynamoDBDocumentClient, enum_, getIndexItem, getItem, getItems, json, migrate, mockDynamoDB, number, object, optional, putItem, putItems, query, record, scan, seed, seedTable, set, streamTable, string, transactRead, transactWrite, ttl, tuple, uint8array, unknown, updateItem, uuid };
