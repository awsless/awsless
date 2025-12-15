import { AttributeType } from '../schema/schema'
import { AnyTable } from '../table'
import { ExpressionAttributes } from './attributes'
import { createFluent, Fluent, getFluentExpression, getFluentPath } from './fluent'
import {
	AndFunction,
	BetweenFunction,
	ContainsFunction,
	EqualFunction,
	ExistsFunction,
	GreaterThanFunction,
	GreaterThanOrEqualFunction,
	InFunction,
	LessThanFunction,
	LessThanOrEqualFunction,
	NotEqualFunction,
	NotExistsFunction,
	NotFunction,
	OrFunction,
	Path,
	SizeFunction,
	StartsWithFunction,
	TypeFunction,
} from './types'

type BaseConditionExpression<A extends AttributeType, T> =
	//
	Path<A, any> & EqualFunction<A, T> & NotEqualFunction<A, T> & ExistsFunction & NotExistsFunction & TypeFunction<A>

// type LogicalConditionExpression<T> =
// 	//
// 	AndFunction<T> | OrFunction<T> | NotFunction<T>

// export type MapConditionExpression<T, R extends Record<string, any>> =
// 	// | LogicalConditionExpression<MapConditionExpression<T, R>>
// 	| AndFunction<MapConditionExpression<T, R>>
// 	| OrFunction<MapConditionExpression<T, R>>
// 	| NotFunction<MapConditionExpression<T, R>>
// 	| BaseConditionExpression<T>
// 	| R

export type RootConditionExpression<R extends Record<string, any>> = {
	at<K extends keyof R>(key: K): R[K]
} & AndFunction &
	OrFunction &
	NotFunction &
	SizeFunction &
	R

export type MapConditionExpression<T, R extends Record<string, any>> = {
	at<K extends keyof R>(key: K): R[K]
} & BaseConditionExpression<'M', T> &
	R

export type VariantConditionExpression<T> = BaseConditionExpression<'M', T>

// export type RecordConditionExpression<T, C> =
// 	// | LogicalConditionExpression<MapConditionExpression<T, R>>
// 	| AndFunction<RecordConditionExpression<T, C>>
// 	| OrFunction<RecordConditionExpression<T, C>>
// 	| NotFunction<RecordConditionExpression<T, C>>
// 	| BaseConditionExpression<T>
// 	| C

export type ListConditionExpression<T, L extends any[]> = {
	at<K extends number>(key: K): L[K]
} & BaseConditionExpression<'L', T> &
	ContainsFunction<'L', T>

export type TupleWithRestConditionExpression<T extends any[], L extends any[], R> = {
	at<K extends number>(index: K): L[K] extends undefined ? R : L[K]
} & BaseConditionExpression<'L', T> &
	ContainsFunction<'L', T>

export type SetConditionExpression<A extends AttributeType, T> = BaseConditionExpression<A, T> & ContainsFunction<A, T>

export type StringConditionExpression<T> = BaseConditionExpression<'S', T> &
	StartsWithFunction &
	ContainsFunction<'S', string> &
	InFunction<'S', T>

export type JsonConditionExpression<T> = BaseConditionExpression<'S', T>

export type NumberConditionExpression<T> = BaseConditionExpression<'N', T> &
	GreaterThanFunction<T> &
	GreaterThanOrEqualFunction<T> &
	LessThanFunction<T> &
	LessThanOrEqualFunction<T> &
	BetweenFunction<T> &
	InFunction<'N', T>

export type BinaryConditionExpression<T> = BaseConditionExpression<'B', T> & InFunction<'B', T>

export type BooleanConditionExpression<T> = BaseConditionExpression<'BOOL', T>

export type UnknownConditionExpression<T> = BaseConditionExpression<AttributeType, T>

export type ConditionExpression<T extends AnyTable> = (
	// e: T['schema'][symbol]['Expression']['Condition']
	e: T['schema'][symbol]['Expression']['Root']['Condition']
) => Fluent | Fluent[]

export const buildConditionExpression = (
	attrs: ExpressionAttributes,
	builder?: (e: any) => Fluent | Fluent[]
): string | undefined => {
	if (!builder) {
		return
	}

	const fluent = builder(createFluent())

	const build = (fluent: Fluent | Fluent[]): string => {
		if (Array.isArray(fluent)) {
			return build(createFluent().and(fluent))
		}

		const { path, op, value } = getFluentExpression(fluent)

		if (op === 'and' || op === 'or') {
			const expressions = value[0].map((item: Fluent) => build(item))
			return `(${expressions.join(` ${op.toUpperCase()} `)})`
		}

		if (op === 'not') {
			return `NOT ${build(value[0])}`
		}

		let p: string
		let v: (value: any) => string

		const [k1, k2] = path as [unknown, unknown]
		if (k1 === 'size' && k2 instanceof Fluent) {
			p = `size(${attrs.path(getFluentPath(k2))})`
			v = value => {
				return attrs.raw({ N: value })
			}
		} else {
			p = attrs.path(path)
			v = value => {
				return attrs.value(value, path)
			}
		}

		const param = (index: number) => {
			const entry = value[index]

			if (entry instanceof Fluent) {
				return attrs.path(getFluentPath(entry))
			}

			return v(entry)
		}

		switch (op) {
			case 'eq':
				return `${p} = ${param(0)}`
			case 'nq':
				return `${p} <> ${param(0)}`
			case 'lt':
				return `${p} < ${param(0)}`
			case 'lte':
				return `${p} <= ${param(0)}`
			case 'gt':
				return `${p} > ${param(0)}`
			case 'gte':
				return `${p} >= ${param(0)}`
			case 'between':
				return `${p} BETWEEN ${param(0)} AND ${param(1)}`
			case 'in':
				return `${p} IN (${value[0]
					.map((item: any) => {
						if (item instanceof Fluent) {
							return attrs.path(getFluentPath(item))
						}
						return attrs.value(item, path)
					})
					.join(', ')})`
			case 'contains':
				return `contains(${p}, ${param(0)})`
			case 'startsWith':
				return `begins_with(${p}, ${param(0)})`
			case 'exists':
				return `attribute_exists(${p})`
			case 'notExists':
				return `attribute_not_exists(${p})`
			case 'type':
				return `attribute_type(${p}, ${attrs.raw({
					S: value[0],
				})})`
		}

		throw new TypeError(`Unsupported operator: ${op}`)
	}

	return build(fluent)
}
