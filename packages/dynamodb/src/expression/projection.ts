import { AnyTable, Infer } from '../table'
import { ExpressionAttributes } from './attributes'

// type IsOptional<T, K extends keyof T> = {} extends Pick<T, K> ? true : false

// type FilterByProjection<T, P> = {
// 	[K in keyof T & keyof P]: P[K] extends true
// 		? T[K]
// 		: P[K] extends object
// 			? NonNullable<T[K]> extends object
// 				? IsOptional<T, K> extends true
// 					? FilterByProjection<NonNullable<T[K]>, P[K]> | undefined
// 					: FilterByProjection<NonNullable<T[K]>, P[K]>
// 				: never
// 			: never
// }

type FilterByProjection<T extends AnyTable, P extends ProjectionExpression<T>> = {
	[K in keyof Infer<T> & P[keyof P]]: Infer<T>[K]
}

export type ProjectionExpression<T extends AnyTable> = Array<Extract<keyof Infer<T>, string>>

export type ProjectionResponse<T extends AnyTable, P extends ProjectionExpression<T> | undefined> = undefined extends P
	? Infer<T>
	: P extends ProjectionExpression<T>
		? FilterByProjection<T, P>
		: Infer<T>

export const buildProjectionExpression = (attrs: ExpressionAttributes, projection?: string[]) => {
	if (!projection) {
		return
	}

	return projection.map(key => attrs.name(key)).join(', ')
}

// import { IDGenerator } from '../helper/id-generator'
// import { AnyTable } from '../table'

// type DeepPick<O, P> = P extends keyof O
// 	? { [_ in P]: O[P] }
// 	: P extends [infer K]
// 		? K extends keyof O
// 			? { [_ in K]: O[K] }
// 			: never
// 		: P extends [infer K, ...infer R]
// 			? K extends keyof O
// 				? { [_ in K]: DeepPick<O[K], R> }
// 				: never
// 			: never

// type DeepPickList<O, P extends unknown[]> = {
// 	[K in keyof P]: DeepPick<O, P[K]>
// }[number]

// type Merge<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never

// export type ProjectionExpression<T extends AnyTable> = Array<
// 	T['schema']['PATHS'] | Exclude<T['schema']['PATHS'][number], number>
// >

// export type ProjectionResponse<T extends AnyTable, P extends ProjectionExpression<T> | undefined> =
// 	P extends ProjectionExpression<T> ? Merge<DeepPickList<T['schema']['OUTPUT'], P>> : T['schema']['OUTPUT']
