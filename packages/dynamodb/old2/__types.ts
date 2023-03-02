
// import { Struct } from './struct/struct'


// type Key<S extends AnyStruct, K extends keyof S['INPUT']> = Record<K, S['INPUT'][K]>
// export type HashKey<T extends AnyTableDefinition> = Key<T['schema'], T['hash']>
// export type SortKey<T extends AnyTableDefinition> = T['sort'] extends string ? Key<T['schema'], T['sort']> : {}
// export type PrimaryKey<T extends AnyTableDefinition> = HashKey<T> & SortKey<T>


// type WalkPath<Object, Path extends Array<unknown>> = (
// 	Path extends [ infer Key extends keyof Object, ...infer Rest ]
// 	? WalkPath<Object[Key], Rest>
// 	: Object
// )

// export type InferPath<T extends AnyTableDefinition> = T['schema']['PATHS']
// export type InferValue<T extends AnyTableDefinition, P extends T['schema']['PATHS']> = WalkPath<T['schema']['INPUT'], P>



// export interface Options {
// 	client?: DynamoDBClient
// }

// export interface MutateOptions<T extends AnyTableDefinition, R extends ReturnValues> extends Options {
// 	condition?: (builder:Condition<T>) => void
// 	return?: R
// }
