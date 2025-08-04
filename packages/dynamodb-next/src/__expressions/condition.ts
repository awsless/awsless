import { AttributeValue } from '@aws-sdk/client-dynamodb'
import { AnyTable } from '../table'
import { ExpressionAttributes } from './attributes'
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
	NotFunction,
	OrFunction,
	SizeFunction,
	StartsWithFunction,
} from './types'

type BaseConditionExpression<T> =
	//
	EqualFunction<T> | NotEqualFunction<T> | ExistsFunction

// type LogicalConditionExpression<T> =
// 	//
// 	AndFunction<T> | OrFunction<T> | NotFunction<T>

export type MapConditionExpression<T, R extends Record<string, any>> =
	// | LogicalConditionExpression<MapConditionExpression<T, R>>
	| AndFunction<MapConditionExpression<T, R>>
	| OrFunction<MapConditionExpression<T, R>>
	| NotFunction<MapConditionExpression<T, R>>
	| BaseConditionExpression<T>
	| R

// export type RecordConditionExpression<T, C> =
// 	// | LogicalConditionExpression<MapConditionExpression<T, R>>
// 	| AndFunction<RecordConditionExpression<T, C>>
// 	| OrFunction<RecordConditionExpression<T, C>>
// 	| NotFunction<RecordConditionExpression<T, C>>
// 	| BaseConditionExpression<T>
// 	| C

export type ListConditionExpression<T> =
	| AndFunction<ListConditionExpression<T>>
	| OrFunction<ListConditionExpression<T>>
	| NotFunction<ListConditionExpression<T>>
	| BaseConditionExpression<T>
	| ContainsFunction<T>
	| SizeFunction<T>

export type SetConditionExpression<T> =
	| AndFunction<SetConditionExpression<T>>
	| OrFunction<SetConditionExpression<T>>
	| NotFunction<SetConditionExpression<T>>
	| BaseConditionExpression<T>
	| ContainsFunction<T>
	| SizeFunction<T>

export type StringConditionExpression<T> =
	| AndFunction<StringConditionExpression<T>>
	| OrFunction<StringConditionExpression<T>>
	| NotFunction<StringConditionExpression<T>>
	| BaseConditionExpression<T>
	| StartsWithFunction<T>
	| ContainsFunction<T>
	| InFunction<T>
	| SizeFunction<T>

export type NumberConditionExpression<T> =
	| AndFunction<NumberConditionExpression<T>>
	| OrFunction<NumberConditionExpression<T>>
	| NotFunction<NumberConditionExpression<T>>
	| BaseConditionExpression<T>
	| GreaterThanFunction<T>
	| GreaterThanOrEqualFunction<T>
	| LessThanFunction<T>
	| LessThanOrEqualFunction<T>
	| BetweenFunction<T>
	| InFunction<T>

export type BooleanConditionExpression<T> =
	| AndFunction<BooleanConditionExpression<T>>
	| OrFunction<BooleanConditionExpression<T>>
	| NotFunction<BooleanConditionExpression<T>>
	| BaseConditionExpression<T>

export type BinaryConditionExpression<T> =
	| AndFunction<BinaryConditionExpression<T>>
	| OrFunction<BinaryConditionExpression<T>>
	| NotFunction<BinaryConditionExpression<T>>
	| BaseConditionExpression<T>

export type UnknownConditionExpression<T> =
	| AndFunction<UnknownConditionExpression<T>>
	| OrFunction<UnknownConditionExpression<T>>
	| NotFunction<UnknownConditionExpression<T>>
	| BaseConditionExpression<T>

// export type BaseCondition<T> =
//   | { $eq: { field: keyof T; value: any } }
//   | { $exists: { field: keyof T } }

// export interface AndFunction<T> {
//   $and: ConditionExpression<T>[]
// }

// export interface OrFunction<T> {
//   $or: ConditionExpression<T>[]
// }

// export type Test<T> =
//   | AndFunction<T>
//   | OrFunction<T>
//   | BaseCondition<T>

// type RootConditionExpression<T extends MapSchema = MapSchema> =
// 	| { [K in keyof T['ENTRIES']]?: AnyExpression<T['ENTRIES'][K]> }
// 	| AndFunction<ConditionExpression<T>>
// 	| OrFunction<ConditionExpression<T>>

export type ConditionExpression<T extends AnyTable> = T['schema'][symbol]['Expression']['Condition']

export const buildConditionExpression = (attrs: ExpressionAttributes, condition?: object) => {
	if (!condition) {
		return
	}

	const find = (object: object, path: string[], combiner: 'AND' | 'OR') => {
		const result: string[] = []

		const group = (combiner: 'AND' | 'OR', options: object[] | object) => {
			if (Array.isArray(options)) {
				result.push(`(${options.map(prop => find(prop, path, combiner)).join(` ${combiner} `)})`)
			} else {
				result.push(find(options, path, combiner))
			}
		}

		const cmp = (p: string, op: string, value: AttributeValue) => {
			result.push(`${p} ${op} ${attrs.value(value, path)}`)
		}

		for (const [key, prop] of Object.entries(object)) {
			if (key.startsWith('$')) {
				const p = attrs.path(path)

				switch (key) {
					case '$and':
						group('AND', prop)
						break

					case '$or':
						group('OR', prop)
						break

					case '$not':
						result.push(`NOT ${find(prop, path, 'AND')}`)
						break

					case '$eq':
						cmp(p, '=', prop)
						break

					case '$nq':
						cmp(p, '<>', prop)
						break

					case '$gt':
						cmp(p, '>', prop)
						break

					case '$gte':
						cmp(p, '>=', prop)
						break

					case '$lt':
						cmp(p, '<', prop)
						break

					case '$lte':
						cmp(p, '<=', prop)
						break

					case '$between':
						result.push(`(${p} BETWEEN ${attrs.value(prop[0], path)} AND ${attrs.value(prop[1], path)})`)
						break

					case '$in':
						result.push(`(${p} IN (${(prop as any[]).map(v => attrs.value(v, path)).join(', ')}))`)
						break

					case '$exists':
						if (prop === true) {
							result.push(`attribute_exists(${p})`)
						} else {
							result.push(`attribute_not_exists(${p})`)
						}
						break

					case '$type':
						result.push(`attribute_type(${p}, ${attrs.raw({ S: prop })})`)
						break

					case '$startsWith':
						result.push(`begins_with(${p}, ${attrs.value(prop, path)})`)
						break

					case '$contains':
						result.push(`contains(${p}, ${attrs.value(prop, path)})`)
						break

					// case '$size':
					// 	result.push(`size(${p})`)
					// 	break
				}
			} else if (prop.constructor === Object) {
				result.push(find(prop, [...path, key], 'AND'))
			}
		}

		if (result.length > 1) {
			return `(${result.join(` ${combiner} `)})`
		} else {
			return result.join('')
		}
	}

	return find(condition, [], 'AND')
}
