import { NativeAttributeBinary, marshallOptions, unmarshallOptions } from "@aws-sdk/util-dynamodb";
import { BigFloat } from "@awsless/big-float";
import { AttributeValue, BatchGetItemCommand, BatchWriteItemCommand, ConditionalCheckFailedException, CreateTableCommandInput, DeleteItemCommand, DynamoDBClient, DynamoDBClient as DynamoDBClient$1, DynamoDBServiceException, GetItemCommand, PutItemCommand, QueryCommand, ScanCommand, TransactGetItem, TransactGetItemsCommand, TransactWriteItem, TransactWriteItemsCommand, TransactionCanceledException, TransactionConflictException, TransactionInProgressException, UpdateItemCommand, UpdateItemCommandInput } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, DynamoDBDocumentClient as DynamoDBDocumentClient$1 } from "@aws-sdk/lib-dynamodb";
import { DynamoDBServer, DynamoDBServer as DynamoDBServer$1 } from "@awsless/dynamodb-server";
import { UUID } from "node:crypto";
//#region src/schema/schema.d.ts
type GenericSchema = BaseSchema<any>;
type MarshallInputTypes = {
  S: string;
  N: string;
  B: NativeAttributeBinary;
  BOOL: boolean;
  NULL: true;
  M: Record<string, Partial<MarshallInputTypes>>;
  L: Partial<MarshallInputTypes>[];
  SS: string[] | undefined;
  NS: string[] | undefined;
  BS: NativeAttributeBinary[] | undefined;
};
type MarshallOutputTypes = {
  S: string;
  N: string;
  B: Uint8Array;
  BOOL: boolean;
  NULL: true;
  M: Record<string, Partial<MarshallOutputTypes>>;
  L: Partial<MarshallOutputTypes>[];
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
  readonly name: string;
  readonly type?: A;
  validateInput(value: T): boolean;
  validateOutput(value: AttributeOutput<A> | undefined): boolean;
  marshall(value: T, path: Array<string | number>): AttributeInput<A>;
  unmarshall(value: AttributeOutput<A>, path: Array<string | number>, projection?: string[]): T;
  walk?(...path: Array<string | number>): GenericSchema | undefined;
};
//#endregion
//#region src/table.d.ts
type GenericMapSchema = BaseSchema<'M'>;
type Infer<T extends AnyTable> = T['schema'][symbol]['Type'];
type AnyTable<T extends GenericMapSchema = GenericMapSchema> = Table<T, any, any, any>;
type IndexNames<T extends AnyTable> = Extract<keyof T['indexes'], string>;
type TableIndex<Schema extends GenericMapSchema> = {
  hash: Extract<keyof Schema[symbol]['Type'], string> | Extract<keyof Schema[symbol]['Type'], string>[];
  sort?: Extract<keyof Schema[symbol]['Type'], string> | Extract<keyof Schema[symbol]['Type'], string>[] | undefined;
};
type TableIndexes<Schema extends GenericMapSchema> = Record<string, TableIndex<Schema>>;
declare class Table<Schema extends GenericMapSchema, Hash extends Extract<keyof Schema[symbol]['Type'], string>, Sort extends Extract<keyof Schema[symbol]['Type'], string> | undefined, Indexes extends TableIndexes<Schema> | undefined> {
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
  get keys(): (Hash | NonNullable<Sort>)[];
  walk(...path: Array<string | number>): Schema | GenericSchema;
  marshall(item: Partial<Schema[symbol]['Type']>): Record<string, AttributeValue>;
  unmarshall(item: any, projection?: string[]): Schema[symbol]['Type'];
}
declare const define: <Schema extends GenericMapSchema, Hash extends Extract<keyof Schema[symbol]['Type'], string>, Sort extends Extract<keyof Schema[symbol]['Type'], string> | undefined, Indexes extends TableIndexes<Schema> | undefined>(name: string, options: {
  hash: Hash;
  sort?: Sort;
  schema: Schema;
  indexes?: Indexes;
}) => Table<Schema, Hash, Sort, Indexes>;
//#endregion
//#region src/types/key.d.ts
type Key$1<T extends AnyTable, K extends keyof Infer<T> | (keyof Infer<T>)[]> = K extends keyof Infer<T> ? Required<Record<K, Infer<T>[K]>> : K extends (keyof Infer<T>)[] ? { [P in K[number]]: Required<Infer<T>[P]>; } : never;
type HashKey<T extends AnyTable, I extends IndexNames<T> | undefined = undefined> = I extends IndexNames<T> ? Key$1<T, T['indexes'][I]['hash']> : Key$1<T, T['hash']>;
type SortKey<T extends AnyTable, I extends IndexNames<T> | undefined = undefined> = I extends IndexNames<T> ? T['indexes'][I]['sort'] extends string ? Key$1<T, T['indexes'][I]['sort']> : {} : T['sort'] extends string ? Key$1<T, T['sort']> : {};
type PrimaryKey<T extends AnyTable, I extends IndexNames<T> | undefined = undefined> = HashKey<T, I> & SortKey<T, I>;
type QueryKey<T extends AnyTable, I extends IndexNames<T> | undefined = undefined> = HashKey<T, I> & Partial<SortKey<T, I>>;
//#endregion
//#region src/types/options.d.ts
type Options$1 = {
  client?: DynamoDBClient$1;
};
//#endregion
//#region src/command/transact-write.d.ts
type Transactable = {
  transact(): TransactWriteItem;
};
type TransactWriteOptions$1 = Options$1 & {
  idempotantKey?: string;
};
declare const transactWrite: (items: Transactable[], options?: TransactWriteOptions$1) => Promise<void>;
//#endregion
//#region src/expression/attributes.d.ts
type ExpressionAttributeNames = Record<string, string>;
type ExpressionAttributeValues = Record<string, AttributeValue>;
//#endregion
//#region src/expression/fluent.d.ts
declare const secret: unique symbol;
declare class Fluent extends Function {
  readonly [secret]: any[];
}
declare const createFluent: () => any;
//#endregion
//#region src/expression/condition.d.ts
type BaseConditionExpression<A extends AttributeType, T> = Path<A, any> & EqualFunction<A, T> & NotEqualFunction<A, T> & ExistsFunction & NotExistsFunction & TypeFunction<A>;
type RootConditionExpression<R extends Record<string, any>> = {
  at<K extends keyof R>(key: K): R[K];
} & AndFunction & OrFunction & NotFunction & SizeFunction & R;
type MapConditionExpression<T, R extends Record<string, any>> = {
  at<K extends keyof R>(key: K): R[K];
} & BaseConditionExpression<'M', T> & R;
type VariantConditionExpression<T> = BaseConditionExpression<'M', T>;
type ElementOfList<T> = T extends (infer E)[] ? E : never;
type ElementOfSet<T> = T extends Set<infer E> ? E : never;
type ListConditionExpression<T, L extends any[]> = {
  at<K extends number>(key: K): L[K];
} & BaseConditionExpression<'L', T> & ContainsFunction<'L', ElementOfList<T>>;
type TupleConditionExpression<T extends any[], L extends any[]> = {
  at<K extends number>(key: K): L[K];
} & BaseConditionExpression<'L', T>;
type TupleWithRestConditionExpression<T extends any[], L extends any[], R> = {
  at<K extends number>(index: K): L[K] extends undefined ? R : L[K];
} & BaseConditionExpression<'L', T>;
type SetConditionExpression<A extends AttributeType, T> = BaseConditionExpression<A, T> & ContainsFunction<A, ElementOfSet<T>>;
type StringConditionExpression<T> = BaseConditionExpression<'S', T> & StartsWithFunction & ContainsFunction<'S', string> & InFunction<'S', T>;
type UuidConditionExpression<T> = BaseConditionExpression<'S', T> & InFunction<'S', T>;
type JsonConditionExpression<T> = BaseConditionExpression<'S', T>;
type NumberConditionExpression<T> = BaseConditionExpression<'N', T> & GreaterThanFunction<T> & GreaterThanOrEqualFunction<T> & LessThanFunction<T> & LessThanOrEqualFunction<T> & BetweenFunction<T> & InFunction<'N', T>;
type BinaryConditionExpression<T> = BaseConditionExpression<'B', T> & InFunction<'B', T>;
type BooleanConditionExpression<T> = BaseConditionExpression<'BOOL', T>;
type UnknownConditionExpression<T> = BaseConditionExpression<AttributeType, T>;
type ConditionExpression<T extends AnyTable> = (e: T['schema'][symbol]['Expression']['Root']['Condition']) => Fluent | Fluent[];
//#endregion
//#region src/expression/update.d.ts
type BaseUpdateExpression<A extends AttributeType, T> = Path<A, T> & SetFunction<A, T> & SetIfNotExistFunction<A, T> & DeleteFunction<T>;
type RootUpdateExpression<T, P extends Record<string, any>> = {
  at<K extends keyof P>(key: K): P[K];
} & P & SetPartialFunction<'M', Partial<T>>;
type RootWithRestUpdateExpression<T, P extends Record<string, any>, R> = {
  at<K extends keyof P>(key: K): P[K];
  at(key: string): R & DeleteFunction;
} & P & SetPartialFunction<'M', Partial<T>>;
type MapUpdateExpression<T, P extends Record<string, any>> = {
  at<K extends keyof P>(key: K): P[K];
} & P & BaseUpdateExpression<'M', T> & SetPartialFunction<'M', T>;
type MapWithRestUpdateExpression<T, P extends Record<string, any>, R> = {
  at<K extends keyof P>(key: K): P[K];
  at(key: string): R & DeleteFunction;
} & P & BaseUpdateExpression<'M', T> & SetPartialFunction<'M', T>;
type VariantUpdateExpression<T> = BaseUpdateExpression<'M', T>;
type ListUpdateExpression<T extends any[], L extends any[]> = {
  at<K extends keyof L>(index: K): L[K] & DeleteFunction;
} & BaseUpdateExpression<'L', T> & AppendFunction<T> & PrependFunction<T>;
type TupleUpdateExpression<T extends any[], L extends any[]> = {
  at<K extends keyof L>(index: K): L[K];
} & BaseUpdateExpression<'L', T>;
type TupleWithRestUpdateExpression<T extends any[], L extends any[], R> = {
  at<K extends number>(index: K): L[K] extends undefined ? R & DeleteFunction : L[K];
} & BaseUpdateExpression<'L', T>;
type SetUpdateExpression<A extends AttributeType, T> = BaseUpdateExpression<A, T> & AddFunction<A, T> & RemoveFunction<A, T>;
type UnknownUpdateExpression<T> = BaseUpdateExpression<AttributeType, T>;
type BooleanUpdateExpression<T> = BaseUpdateExpression<'BOOL', T>;
type BinaryUpdateExpression<T> = BaseUpdateExpression<'B', T>;
type StringUpdateExpression<T> = BaseUpdateExpression<'S', T>;
type NumberUpdateExpression<T> = BaseUpdateExpression<'N', T> & IncrementFunction<T> & DecrementFunction<T>;
type UpdateExpression<T extends AnyTable> = (e: T['schema'][symbol]['Expression']['Root']['Update']) => Fluent | Fluent[];
//#endregion
//#region src/expression/types.d.ts
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
type DeleteFunction<T = undefined> = undefined extends T ? {
  /** Delete attribute value. */
  delete(): Fluent;
} : {};
type AppendFunction<T extends any[] | undefined, I = NonNullable<T>[number]> = {
  /**
   * Append one or more elements to the end of the array.
   * @param {...NonNullable<T>} values - The elements to append to the array.
   */
  append(...values: [I, ...I[]]): Fluent;
  append(value: Path<AttributeType, I>): Fluent;
};
type PrependFunction<T extends any[] | undefined, I = NonNullable<T>[number]> = {
  /**
   * Prepend one or more elements to the start of the array.
   * @param {...NonNullable<T>} values - The elements to append to the array.
   */
  prepend(...values: [I, ...I[]]): Fluent;
  prepend(value: Path<AttributeType, I>): Fluent;
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
type InnerSetValue<T> = T extends Set<infer R> ? R : never;
type AddFunction<A extends AttributeType, T, V = InnerSetValue<NonNullable<T>>> = {
  /**
   * Add elements to a Set.
   * @param {...V} values - The elements to add to the Set.
   */
  add(...values: [V, ...V[]]): Fluent;
  add(value: Path<A, T>): Fluent;
};
type RemoveFunction<A extends AttributeType, T, V = InnerSetValue<NonNullable<T>>> = {
  /**
   * Remove elements from a Set.
   * @param {...V} values - The elements to remove to the Set.
   */
  remove(...values: [V, ...V[]]): Fluent;
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
type UuidExpression<T> = Expression<StringUpdateExpression<T>, UuidConditionExpression<T>>;
type NumberExpression<T> = Expression<NumberUpdateExpression<T>, NumberConditionExpression<T>>;
type BooleanExpression<T> = Expression<BooleanUpdateExpression<T>, BooleanConditionExpression<T>>;
type BinaryExpression<T> = Expression<BinaryUpdateExpression<T>, BinaryConditionExpression<T>>;
type JsonExpression<T> = Expression<StringUpdateExpression<T>, JsonConditionExpression<T>>;
type MapExpression<T, P extends Record<string, GenericSchema>, R extends GenericSchema | undefined = undefined, P_UPDATE extends Record<string, any> = { [K in keyof P]: P[K][symbol]['Expression']['Update']; }, P_CONDITION extends Record<string, any> = { [K in keyof P]: P[K][symbol]['Expression']['Condition']; } & (R extends GenericSchema ? Record<string, R[symbol]['Expression']['Condition']> : {})> = Expression<R extends GenericSchema ? MapWithRestUpdateExpression<T, P_UPDATE, R[symbol]['Expression']['Update']> : MapUpdateExpression<T, P_UPDATE>, MapConditionExpression<T, P_CONDITION>, R extends GenericSchema ? RootWithRestUpdateExpression<T, P_UPDATE, R[symbol]['Expression']['Update']> : RootUpdateExpression<T, P_UPDATE>, RootConditionExpression<P_CONDITION>>;
type VariantExpression<T> = Expression<VariantUpdateExpression<T>, VariantConditionExpression<T>>;
type ListExpression<T extends any[], L extends GenericSchema[]> = Expression<ListUpdateExpression<T, { [K in keyof L]: L[K][symbol]['Expression']['Update']; }>, ListConditionExpression<T, { [K in keyof L]: L[K][symbol]['Expression']['Condition']; }>>;
type TupleExpression<T extends any[], L extends GenericSchema[]> = Expression<TupleUpdateExpression<T, { [K in keyof L]: L[K][symbol]['Expression']['Update']; }>, TupleConditionExpression<T, { [K in keyof L]: L[K][symbol]['Expression']['Condition']; }>>;
type TupleWithRestExpression<T extends any[], L extends GenericSchema[], R extends GenericSchema> = Expression<TupleWithRestUpdateExpression<T, { [K in keyof L]: L[K][symbol]['Expression']['Update']; }, R[symbol]['Expression']['Update']>, TupleWithRestConditionExpression<T, { [K in keyof L]: L[K][symbol]['Expression']['Condition']; }, R[symbol]['Expression']['Condition']>>;
type SetExpression<A extends AttributeType, T> = Expression<SetUpdateExpression<A, T>, SetConditionExpression<A, T>>;
type UnknownExpression<T> = Expression<UnknownUpdateExpression<T>, UnknownConditionExpression<T>>;
type EnumExpression<T> = Expression<UnknownUpdateExpression<T>, UnknownConditionExpression<T>>;
//#endregion
//#region src/schema/optional.d.ts
type OptionalSchema<T extends GenericSchema> = BaseSchema<T['type'], T[symbol]['Type'] | undefined, 'S' extends T['type'] ? StringExpression<T[symbol]['Type'] | undefined> : 'N' extends T['type'] ? NumberExpression<T[symbol]['Type'] | undefined> : 'BOOL' extends T['type'] ? BooleanExpression<T[symbol]['Type'] | undefined> : 'B' extends T['type'] ? BinaryExpression<T[symbol]['Type'] | undefined> : NonNullable<T['type']> extends 'SS' | 'NS' | 'BS' ? SetExpression<NonNullable<T['type']>, T[symbol]['Type'] | undefined> : T[symbol]['Expression']>;
declare const optional: <T extends GenericSchema>(schema: T) => OptionalSchema<T>;
//#endregion
//#region src/schema/unknown.d.ts
type UnknownOptions = {
  marshall?: marshallOptions;
  unmarshall?: unmarshallOptions;
};
type UnknownSchema = BaseSchema<AttributeType, unknown, UnknownExpression<unknown>>;
declare const unknown: (opts?: UnknownOptions) => UnknownSchema;
//#endregion
//#region src/schema/any.d.ts
type AnySchema = BaseSchema<AttributeType, any, UnknownExpression<any>>;
declare const any: (opts?: UnknownOptions) => AnySchema;
//#endregion
//#region src/schema/set.d.ts
type AllowedSchema = BaseSchema<'S'> | BaseSchema<'N'> | BaseSchema<'B'>;
type SetSchema<T extends AllowedSchema> = BaseSchema<`${NonNullable<T['type']>}S`, Set<T[symbol]['Type']>, SetExpression<`${NonNullable<T['type']>}S`, Set<T[symbol]['Type']>>>;
declare const set: <S extends AllowedSchema>(schema: S) => SetSchema<S>;
//#endregion
//#region src/schema/uuid.d.ts
type UuidSchema = BaseSchema<'S', UUID, UuidExpression<UUID>>;
declare const uuid: () => UuidSchema;
//#endregion
//#region src/schema/string.d.ts
type StringSchema<T extends string = string> = BaseSchema<'S', T, StringExpression<T>>;
declare function string(): StringSchema;
declare function string<T extends string>(): StringSchema<T>;
//#endregion
//#region src/schema/boolean.d.ts
type BooleanSchema<T extends boolean = boolean> = BaseSchema<'BOOL', T, BooleanExpression<T>>;
declare function boolean(): BooleanSchema;
declare function boolean<T extends boolean>(): BooleanSchema<T>;
//#endregion
//#region src/schema/number.d.ts
type NumberSchema<T extends number = number> = BaseSchema<'N', T, NumberExpression<T>>;
declare function number(): NumberSchema;
declare function number<T extends number>(): NumberSchema<T>;
//#endregion
//#region src/schema/bigint.d.ts
type BigIntSchema<T extends bigint = bigint> = BaseSchema<'N', T, NumberExpression<T>>;
declare function bigint(): BigIntSchema;
declare function bigint<T extends bigint>(): BigIntSchema<T>;
//#endregion
//#region src/schema/bigfloat.d.ts
type BigFloatSchema = BaseSchema<'N', BigFloat, NumberExpression<BigFloat>>;
declare const bigfloat: ({ precision }?: {
  precision?: number | undefined;
}) => BigFloatSchema;
//#endregion
//#region src/schema/uint8-array.d.ts
type Uint8ArraySchema = BaseSchema<'B', Uint8Array, BinaryExpression<Uint8Array>>;
declare const uint8array: () => Uint8ArraySchema;
//#endregion
//#region src/schema/object.d.ts
type Properties$1 = Record<string, GenericSchema>;
type KeyOf<T> = Extract<keyof T, string>;
type IsOptional<T extends GenericSchema> = undefined extends T[symbol]['Type'] ? true : false;
type FilterOptional<T extends Properties$1> = { [K in KeyOf<T> as IsOptional<T[K]> extends true ? K : never]?: T[K]; };
type FilterRequired<T extends Properties$1> = { [K in KeyOf<T> as IsOptional<T[K]> extends true ? never : K]: T[K]; };
type Optinalize<T extends Properties$1> = FilterOptional<T> & FilterRequired<T>;
type InferProps<S extends Properties$1, R extends GenericSchema | undefined = undefined> = { [K in keyof Optinalize<S>]: S[K][symbol]['Type']; } & (R extends GenericSchema ? {
  [key: string]: R[symbol]['Type'] | S[keyof S][symbol]['Type'];
} : {});
type ObjectSchema<T, P extends Properties$1, R extends GenericSchema | undefined = undefined> = BaseSchema<'M', T, MapExpression<T, P, R>>;
declare const object: <P extends Properties$1, R extends GenericSchema | undefined = undefined>(props: P, rest?: R) => ObjectSchema<InferProps<P, R>, P, R>;
//#endregion
//#region src/schema/record.d.ts
type Infer$2<S extends GenericSchema> = Record<string, S[symbol]['Type']>;
type RecordSchema<S extends GenericSchema> = BaseSchema<'M', Infer$2<S>, MapExpression<Infer$2<S>, {}, S>>;
declare const record: <S extends GenericSchema>(schema: S) => RecordSchema<S>;
//#endregion
//#region src/schema/variant.d.ts
type Infer$1<K extends string, O extends Options<K>> = { [Key in keyof O]: O[Key][symbol]['Type'] & Record<K, Key>; }[keyof O];
type VariantSchema<K extends string, O extends Options<K>> = BaseSchema<'M', Infer$1<K, O>, VariantExpression<Infer$1<K, O>>>;
type Properties = Record<string, GenericSchema>;
type Options<T extends string> = Record<string, ObjectSchema<any, Properties & { [K in T]?: never; }>>;
declare const variant: <K extends string, O extends Options<K>>(key: K, options: O) => VariantSchema<K, O>;
//#endregion
//#region src/schema/array.d.ts
type ArraySchema<T extends GenericSchema> = BaseSchema<'L', T[symbol]['Type'][], ListExpression<T[symbol]['Type'][], T[]>>;
declare const array: <S extends GenericSchema>(schema: S) => ArraySchema<S>;
//#endregion
//#region src/schema/tuple.d.ts
type Tuple<Entries extends GenericSchema[]> = { -readonly [Key in keyof Entries]: Entries[Key][symbol]['Type']; };
type TupleSchema<T extends any[], L extends GenericSchema[]> = BaseSchema<'L', T, TupleExpression<T, L>>;
type TupleWithRestSchema<T extends any[], L extends GenericSchema[], R extends GenericSchema> = BaseSchema<'L', T, TupleWithRestExpression<T, L, R>>;
declare function tuple<const T extends GenericSchema[]>(entries: T): TupleSchema<Tuple<T>, T>;
declare function tuple<const T extends GenericSchema[], const R extends GenericSchema>(entries: T, rest: R): TupleWithRestSchema<[...Tuple<T>, ...Tuple<R[]>], T, R>;
//#endregion
//#region src/schema/date.d.ts
type DateSchema = BaseSchema<'N', Date, NumberExpression<Date>>;
declare const date: () => DateSchema;
//#endregion
//#region src/schema/enum.d.ts
type Enum = Record<string, string | number>;
type EnumSchema<T extends Enum> = BaseSchema<'N' | 'S', T[keyof T], EnumExpression<T[keyof T]>>;
declare function enum_<T extends Enum>(_: T): EnumSchema<T>;
//#endregion
//#region src/schema/json.d.ts
type JsonSchema<T = unknown> = BaseSchema<'S', T, JsonExpression<T>>;
declare const json: <T = unknown>() => JsonSchema<T>;
//#endregion
//#region src/schema/ttl.d.ts
type TtlSchema = BaseSchema<'N', Date, NumberExpression<Date>>;
declare const ttl: () => TtlSchema;
//#endregion
//#region src/test/stream.d.ts
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
//#endregion
//#region src/test/mock.d.ts
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
  engine?: 'speed' | 'correctness';
};
declare const mockDynamoDB: <T extends Tables>(configOrServer: StartDynamoDBOptions<T>) => DynamoDBServer$1;
//#endregion
//#region src/test/migrate.d.ts
declare const migrate: (client: DynamoDBClient$1, tables: CreateTableCommandInput | CreateTableCommandInput[] | AnyTable | AnyTable[]) => Promise<import("@aws-sdk/client-dynamodb").CreateTableCommandOutput[]>;
//#endregion
//#region src/test/seed.d.ts
declare const seedTable: <T extends AnyTable>(table: T, items: Infer<T>[]) => {
  table: T;
  items: Infer<T>[];
};
declare const seed: (defs: ReturnType<typeof seedTable>[]) => Promise<void>;
//#endregion
//#region src/client.d.ts
declare const dynamoDBClient: {
  (): DynamoDBClient$1;
  set(client: DynamoDBClient$1): void;
};
declare const dynamoDBDocumentClient: {
  (): DynamoDBDocumentClient$1;
  set(client: DynamoDBDocumentClient$1): void;
};
//#endregion
//#region src/exception/transaction-canceled.d.ts
type Code = 'None' | 'ThrottlingError' | 'ValidationError' | 'TransactionConflict' | 'ConditionalCheckFailed' | 'ItemCollectionSizeLimitExceeded' | 'ProvisionedThroughputExceeded';
declare module '@aws-sdk/client-dynamodb' {
  interface TransactionCanceledException {
    cancellationReasonAt: (index: number) => Code | undefined;
    /** Will return true if index has a validation error. */
    validationErrorAt: (index: number) => boolean;
    /** Will return true if index has a conditional check failure. */
    conditionFailedAt: (index: number) => boolean;
    /** Will return true if index has a transaction conflict. */
    conflictAt: (index: number) => boolean;
  }
}
//#endregion
//#region src/expression/projection.d.ts
type FilterByProjection<T extends AnyTable, P extends ProjectionExpression<T>> = { [K in keyof Infer<T> & P[keyof P]]: Infer<T>[K]; };
type ProjectionExpression<T extends AnyTable> = Array<Extract<keyof Infer<T>, string>>;
type ProjectionResponse<T extends AnyTable, P extends ProjectionExpression<T> | undefined> = undefined extends P ? Infer<T> : P extends ProjectionExpression<T> ? FilterByProjection<T, P> : Infer<T>;
//#endregion
//#region src/command/get-item.d.ts
declare const getItem: <T extends AnyTable, const P extends ProjectionExpression<T> | undefined>(table: T, key: PrimaryKey<T>, options?: Options$1 & {
  consistentRead?: boolean;
  select?: P;
}) => {
  then<Result1 = ProjectionResponse<T, P> | undefined, Result2 = never>(onfulfilled: (value: ProjectionResponse<T, P> | undefined) => Result1, onrejected?: ((reason: any) => Result2) | undefined): Promise<Result1 | Result2>;
  transact: () => {
    unmarshall: (item: Record<string, AttributeValue>) => ProjectionResponse<T, P>;
    input: {
      Get: import("@aws-sdk/client-dynamodb").GetItemCommandInput;
    };
  };
};
//#endregion
//#region src/expression/return.d.ts
type UpdateReturnValue = 'NONE' | 'ALL_OLD' | 'UPDATED_OLD' | 'ALL_NEW' | 'UPDATED_NEW';
type ReturnValue = 'NONE' | 'ALL_OLD';
type UpdateReturnResponse<T extends AnyTable, R extends UpdateReturnValue> = UpdateReturnValue extends R ? void : R extends 'NONE' ? void : R extends 'ALL_NEW' ? Infer<T> : R extends 'ALL_OLD' ? Infer<T> | undefined : R extends 'UPDATED_NEW' ? Partial<Infer<T>> : Partial<Infer<T>> | undefined;
type ReturnResponse<T extends AnyTable, R extends ReturnValue> = ReturnValue extends R ? void : R extends 'NONE' ? void : Infer<T> | undefined;
//#endregion
//#region src/command/put-item.d.ts
declare const putItem: <T extends AnyTable, R extends ReturnValue>(table: T, item: Infer<T>, options?: Options$1 & {
  return?: R;
  when?: ConditionExpression<T>;
}) => {
  then<Result1 = ReturnResponse<T, R>, Result2 = never>(onfulfilled: (value: ReturnResponse<T, R>) => Result1, onrejected?: ((reason: any) => Result2) | undefined): Promise<Result1 | Result2>;
  transact: () => {
    Put: import("@aws-sdk/client-dynamodb").PutItemCommandInput;
  };
};
//#endregion
//#region src/command/update-item.d.ts
type UpdateOptions<T extends AnyTable, R extends UpdateReturnValue> = Options$1 & {
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
//#endregion
//#region src/command/delete-item.d.ts
declare const deleteItem: <T extends AnyTable, R extends ReturnValue>(table: T, key: PrimaryKey<T>, options?: Options$1 & {
  return?: R;
  when?: ConditionExpression<T>;
}) => {
  then<Result1 = ReturnResponse<T, R>, Result2 = never>(onfulfilled: (value: ReturnResponse<T, R>) => Result1, onrejected?: ((reason: any) => Result2) | undefined): Promise<Result1 | Result2>;
  transact: () => {
    Delete: import("@aws-sdk/client-dynamodb").DeleteItemCommandInput;
  };
};
//#endregion
//#region src/command/command.d.ts
type Thenable<T> = {
  then<Result1 = T, Result2 = never>(onfulfilled: (value: T) => Result1, onrejected?: (reason: any) => Result2): Promise<Result1 | Result2>;
};
//#endregion
//#region src/command/get-items.d.ts
type BatchGetOptions<T extends AnyTable, P extends ProjectionExpression<T> | undefined, F extends boolean> = Options$1 & {
  select?: P;
  consistentRead?: boolean;
  filterNonExistentItems?: F;
};
type BatchGetItem = {
  <T extends AnyTable, P extends ProjectionExpression<T> | undefined>(table: T, keys: PrimaryKey<T>[], options?: BatchGetOptions<T, P, false>): Thenable<(ProjectionResponse<T, P> | undefined)[]>;
  <T extends AnyTable, P extends ProjectionExpression<T> | undefined>(table: T, keys: PrimaryKey<T>[], options?: BatchGetOptions<T, P, true>): Thenable<ProjectionResponse<T, P>[]>;
};
declare const getItems: BatchGetItem;
//#endregion
//#region src/command/put-items.d.ts
declare const putItems: <T extends AnyTable>(table: T, items: Infer<T>[], options?: Options$1) => Thenable<void>;
//#endregion
//#region src/command/delete-items.d.ts
declare const deleteItems: <T extends AnyTable>(table: T, keys: PrimaryKey<T>[], options?: Options$1) => Thenable<void>;
//#endregion
//#region src/command/get-index-item.d.ts
declare const getIndexItem: <T extends AnyTable, I extends IndexNames<T>, const P extends ProjectionExpression<T> | undefined = undefined>(table: T, index: I, key: PrimaryKey<T, I>, options?: Options$1 & {
  select?: P;
}) => Thenable<ProjectionResponse<T, P> | undefined>;
//#endregion
//#region src/expression/key-condition.d.ts
type KeysToUnion<K extends string | string[]> = K extends string ? K : K[keyof K];
type KeyConditionExpression<T extends AnyTable, I extends IndexNames<T> | undefined> = (e: Pick<T['schema'][symbol]['Expression']['Root']['Condition'], I extends IndexNames<T> ? KeysToUnion<T['indexes'][I]['sort']> : T['sort']>) => Fluent | Fluent[];
//#endregion
//#region src/command/query.d.ts
type QueryOptions<T extends AnyTable, P extends ProjectionExpression<T> | undefined, I extends IndexNames<T> | undefined> = Options$1 & {
  where?: KeyConditionExpression<T, I>;
  select?: P;
  index?: I;
  consistentRead?: boolean;
  sort?: 'asc' | 'desc';
  /** @deprecated Use `sort` instead */
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
//#endregion
//#region src/command/scan.d.ts
type ScanOptions<T extends AnyTable, P extends ProjectionExpression<T> | undefined> = Options$1 & {
  select?: P;
  consistentRead?: boolean;
  limit?: number;
  cursor?: string;
  disablePreciseCursor?: boolean;
};
type ScanResponse<T extends AnyTable, P extends ProjectionExpression<T> | undefined> = {
  items: ProjectionResponse<T, P>[];
  cursor?: string;
};
declare const scan: <T extends AnyTable, const P extends ProjectionExpression<T> | undefined = undefined>(table: T, options?: ScanOptions<T, P>) => {
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
//#endregion
//#region src/command/condition-check.d.ts
declare const conditionCheck: <T extends AnyTable>(table: T, key: PrimaryKey<T>, options: {
  when: ConditionExpression<T>;
}) => {
  transact: () => {
    ConditionCheck: {
      ExpressionAttributeNames?: ExpressionAttributeNames;
      ExpressionAttributeValues?: ExpressionAttributeValues;
      TableName: string;
      Key: Record<string, import("@aws-sdk/client-dynamodb").AttributeValue>;
      ConditionExpression: string;
    };
  };
};
//#endregion
//#region src/command/transact-read.d.ts
type Transactable$1 = {
  transact(): {
    input: TransactGetItem;
    unmarshall(item: Record<string, AttributeValue>): any;
  };
};
type TransactReadResponse<T extends Transactable$1[]> = { [K in keyof T]: ReturnType<ReturnType<T[K]['transact']>['unmarshall']> | undefined; };
type TransactWriteOptions = Options$1;
declare const transactRead: <const T extends Transactable$1[]>(items: T, options?: TransactWriteOptions) => Promise<TransactReadResponse<T>>;
//#endregion
export { type AnySchema, type AnyTable, type ArraySchema, BatchGetItemCommand, BatchWriteItemCommand, type BigFloatSchema, type BigIntSchema, type BooleanSchema, ConditionalCheckFailedException, type DateSchema, DeleteItemCommand, DynamoDBClient, DynamoDBDocumentClient, DynamoDBServer, DynamoDBServiceException, type EnumSchema, Fluent, type GenericMapSchema, GetItemCommand, type HashKey, type Infer, type JsonSchema, type NumberSchema, type ObjectSchema, type PrimaryKey, PutItemCommand, QueryCommand, type RecordSchema, ScanCommand, type SetSchema, type SortKey, type StringSchema, Table, TransactGetItemsCommand, TransactWriteItemsCommand, type Transactable, TransactionCanceledException, TransactionConflictException, TransactionInProgressException, type TtlSchema, type TupleSchema, type TupleWithRestSchema, type Uint8ArraySchema, type UnknownSchema, UpdateItemCommand, type UuidSchema, type VariantSchema, any, array, bigfloat, bigint, boolean, conditionCheck, createFluent, date, define, deleteItem, deleteItems, dynamoDBClient, dynamoDBDocumentClient, enum_, getIndexItem, getItem, getItems, json, migrate, mockDynamoDB, number, object, optional, putItem, putItems, query, record, scan, seed, seedTable, set, streamTable, string, transactRead, transactWrite, ttl, tuple, uint8array, unknown, updateItem, uuid, variant };