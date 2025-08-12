import { AnyTable, IndexNames, Infer } from '../table'

type Key<T extends AnyTable, K extends keyof Infer<T>> = Required<Record<K, Infer<T>[K]>>

export type HashKey<T extends AnyTable, I extends IndexNames<T> | undefined = undefined> =
	I extends IndexNames<T> ? Key<T, T['indexes'][I]['hash']> : Key<T, T['hash']>

export type SortKey<T extends AnyTable, I extends IndexNames<T> | undefined = undefined> =
	I extends IndexNames<T>
		? T['indexes'][I]['sort'] extends string
			? Key<T, T['indexes'][I]['sort']>
			: {}
		: T['sort'] extends string
			? Key<T, T['sort']>
			: {}

export type PrimaryKey<T extends AnyTable, I extends IndexNames<T> | undefined = undefined> = HashKey<T, I> &
	SortKey<T, I>

export type QueryKey<T extends AnyTable, I extends IndexNames<T> | undefined = undefined> = HashKey<T, I> &
	Partial<SortKey<T, I>>

// export type CursorKey<T extends AnyTable, I extends IndexNames<T> | undefined = undefined> = PrimaryKey<T> &
// 	(I extends IndexNames<T> ? PrimaryKey<T, I> : {})
