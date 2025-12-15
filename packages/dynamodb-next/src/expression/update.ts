import { AttributeType } from '../schema/schema'
import { AnyTable } from '../table'
import { ExpressionAttributes } from './attributes'
import { createFluent, Fluent, getFluentExpression, getFluentPath } from './fluent'
import {
	AppendFunction,
	DecrementFunction,
	DeleteFunction,
	IncrementFunction,
	Path,
	PushFunction,
	RemoveFunction,
	SetFunction,
	SetIfNotExistFunction,
	SetPartialFunction,
} from './types'

// ------------------------------------------------------------
// Type Expressions

type BaseUpdateExpression<A extends AttributeType, T> = Path<A, T> &
	SetFunction<A, T> &
	SetIfNotExistFunction<A, T> &
	DeleteFunction<T>

export type RootUpdateExpression<T, P extends Record<string, any>> = {
	at<K extends keyof P>(key: K): P[K]
} & P &
	SetPartialFunction<'M', Partial<T>>

export type RootWithRestUpdateExpression<T, P extends Record<string, any>, R> = {
	at<K extends keyof P>(key: K): P[K]
	at(key: string): R & DeleteFunction
} & P &
	SetPartialFunction<'M', Partial<T>>

export type MapUpdateExpression<T, P extends Record<string, any>> = {
	at<K extends keyof P>(key: K): P[K]
	// at(key: string): DeleteFunction
} & P &
	BaseUpdateExpression<'M', T> &
	SetPartialFunction<'M', T>

export type MapWithRestUpdateExpression<T, P extends Record<string, any>, R> = {
	// at<K extends keyof P>(key: K): K extends keyof P ? P[K] : R & DeleteFunction
	at<K extends keyof P>(key: K): P[K]
	at(key: string): R & DeleteFunction
} & P &
	BaseUpdateExpression<'M', T> &
	SetPartialFunction<'M', T>

export type VariantUpdateExpression<T> = BaseUpdateExpression<'M', T>

export type ListUpdateExpression<T extends any[], L extends any[]> = {
	at<K extends keyof L>(index: K): L[K] & DeleteFunction
} & BaseUpdateExpression<'L', T> &
	PushFunction<T>

export type TupleUpdateExpression<T extends any[], L extends any[]> = {
	at<K extends keyof L>(index: K): L[K]
} & BaseUpdateExpression<'L', T>

export type TupleWithRestUpdateExpression<T extends any[], L extends any[], R> = {
	at<K extends number>(index: K): L[K] extends undefined ? R & DeleteFunction : L[K]
} & BaseUpdateExpression<'L', T>

export type SetUpdateExpression<A extends AttributeType, T> = BaseUpdateExpression<A, T> &
	AppendFunction<A, T> &
	RemoveFunction<A, T>

export type UnknownUpdateExpression<T> = BaseUpdateExpression<AttributeType, T>
export type BooleanUpdateExpression<T> = BaseUpdateExpression<'BOOL', T>
export type BinaryUpdateExpression<T> = BaseUpdateExpression<'B', T>
export type StringUpdateExpression<T> = BaseUpdateExpression<'S', T>
export type NumberUpdateExpression<T> = BaseUpdateExpression<'N', T> & IncrementFunction<T> & DecrementFunction<T>

// ------------------------------------------------------------

export type UpdateExpression<T extends AnyTable> = (
	// e: T['schema'][symbol]['Expression']['Update']
	e: T['schema'][symbol]['Expression']['Root']['Update']
) => Fluent | Fluent[]

const shouldDelete = (value: unknown) => {
	return (
		// undefined value's should be deleted.
		typeof value === 'undefined' ||
		// null value's should be deleted.
		value === null ||
		// empty set's should be deleted.
		(value instanceof Set && value.size === 0)
	)
}

export const buildUpdateExpression = (
	attrs: ExpressionAttributes,
	builder?: (e: any) => Fluent | Fluent[]
): string | undefined => {
	if (!builder) {
		return
	}

	const fluent = builder(createFluent())
	const fluents = Array.isArray(fluent) ? fluent : [fluent]

	const set: string[] = []
	const add: string[] = []
	const rem: string[] = []
	const del: string[] = []

	for (const fluent of fluents) {
		const { path, op, value } = getFluentExpression(fluent)
		const p = attrs.path(path)

		const param = (index: number, defaultRaw?: unknown) => {
			const v = value[index]

			if (v instanceof Fluent) {
				return attrs.path(getFluentPath(value[0]))
			}

			if (typeof v !== 'undefined') {
				return attrs.value(v, path)
			}

			return attrs.raw(defaultRaw)
		}

		switch (op) {
			case 'set':
				if (path.length === 0) {
					throw new TypeError(`You can't set the root object`)
				}

				if (shouldDelete(value[0])) {
					rem.push(p)
				} else {
					set.push(`${p} = ${param(0)}`)
				}
				break

			case 'setPartial':
				for (const [k, v] of Object.entries(value[0])) {
					if (shouldDelete(v)) {
						rem.push(k)
					} else {
						set.push(`${attrs.path([...path, k])} = ${attrs.value(v, [...path, k])}`)
					}
				}
				break

			case 'setIfNotExists':
				if (shouldDelete(value[0])) {
					rem.push(p)
				} else {
					set.push(`${p} = if_not_exists(${p}, ${param(0)})`)
				}
				break

			case 'delete':
				rem.push(p)
				break

			case 'push':
				set.push(`${p} = list_append(${p}, ${attrs.value(value, path)})`)
				break

			case 'incr':
				set.push(`${p} = if_not_exists(${p}, ${param(1, { N: '0' })}) + ${param(0)}`)
				break

			case 'decr':
				set.push(`${p} = if_not_exists(${p}, ${param(1, { N: '0' })}) - ${param(0)}`)
				break

			case 'append':
				add.push(`${p} ${param(0)}`)
				break

			case 'remove':
				del.push(`${p} ${param(0)}`)
				break

			default:
				throw new TypeError(`Unsupported operator: ${op}`)
		}
	}

	return (
		[
			['SET', set],
			['ADD', add],
			['REMOVE', rem],
			['DELETE', del],
		] as const
	)
		.filter(([_, entries]) => entries.length)
		.map(([op, entries]) => {
			return `${op} ${entries.join(', ')}`
		})
		.join(' ')
}
