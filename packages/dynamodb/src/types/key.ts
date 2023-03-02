
import { AnyTableDefinition, IndexNames } from "../table"

type Key<
	T extends AnyTableDefinition,
	K extends keyof T['schema']['INPUT']
> = Required<Record<K, T['schema']['INPUT'][K]>>

export type HashKey<
	T extends AnyTableDefinition,
	I extends IndexNames<T> | undefined = undefined
> = (
	I extends IndexNames<T>
		? Key<T, T['indexes'][I]['hash']>
		: Key<T, T['hash']>
)

export type SortKey<
	T extends AnyTableDefinition,
	I extends IndexNames<T> | undefined = undefined
> = (
	I extends IndexNames<T>
		? T['indexes'][I]['sort'] extends string
			? Key<T, T['indexes'][I]['sort']>
			: {}
		: T['sort'] extends string
			? Key<T, T['sort']>
			: {}
)

export type PrimaryKey<
	T extends AnyTableDefinition,
	I extends IndexNames<T> | undefined = undefined
> = HashKey<T, I> & SortKey<T, I>

export type CursorKey<
	T extends AnyTableDefinition,
	I extends IndexNames<T> | undefined = undefined
> = PrimaryKey<T> & ( I extends IndexNames<T> ? PrimaryKey<T, I> : {} )
