import { AnyTable } from '../table'
// import { Union } from 'ts-toolbelt'

// type KeysOfUnion<T> = T extends T ? keyof T: never;

type WalkPath<Object, Path extends Array<unknown>> = Path extends [infer Key extends keyof Object, ...infer Rest]
	? WalkPath<Object[Key], Rest>
	: Object

export type InferPath<T extends AnyTable> = T['schema']['PATHS']

export type InferValue<T extends AnyTable, P extends InferPath<T>> = WalkPath<T['schema']['INPUT'], P>

export type InferSetValue<T extends AnyTable, P extends InferPath<T>> = Parameters<InferValue<T, P>['add']>[0]

export type InferOptionalPath<T extends AnyTable> = T['schema']['OPT_PATHS']

// export type InferTypedPath<T extends AnyTable, P extends InferPath<T>> = InferTypedPath2<T, Union.ListOf<T['schema']['PATHS'][number]>, P>

// export type InferTypedPath2<T extends AnyTable, Paths extends InferPath<T>, P extends InferPath<T>> = {
// 	[K in keyof Paths]: WalkPath<T['schema']['INPUT'], Paths[K]> extends InferValue<T, P> ? Paths[K] : never
// }[keyof Paths]
