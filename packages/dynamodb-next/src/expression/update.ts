import { AttributeType } from '../schema/schema'
import { SET_KEY } from '../schema/set'
import { AnyTable } from '../table'
import { ExpressionAttributes } from './attributes'
import { createFluent, Fluent, getFluentExpression, getFluentPath } from './fluent'
import {
	AddFunction,
	AppendFunction,
	DecrementFunction,
	DeleteFunction,
	IncrementFunction,
	Path,
	PrependFunction,
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
	AppendFunction<T> &
	PrependFunction<T>

export type TupleUpdateExpression<T extends any[], L extends any[]> = {
	at<K extends keyof L>(index: K): L[K]
} & BaseUpdateExpression<'L', T>

export type TupleWithRestUpdateExpression<T extends any[], L extends any[], R> = {
	at<K extends number>(index: K): L[K] extends undefined ? R & DeleteFunction : L[K]
} & BaseUpdateExpression<'L', T>

export type SetUpdateExpression<A extends AttributeType, T> = BaseUpdateExpression<A, T> &
	AddFunction<A, T> &
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
		value === null
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

		const listParam = (index: number) => {
			if (value[index] instanceof Fluent) {
				return attrs.path(getFluentPath(value[0]))
			}

			return attrs.value(value, path)
		}

		const innerSetParam = () => {
			if (value[0] instanceof Fluent) {
				return attrs.path(getFluentPath(value[0]))
			}

			return attrs.innerSetValue(new Set(value), path)
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

			// case 'push':
			case 'append':
				set.push(`${p} = list_append(${p}, ${listParam(0)})`)
				break

			// case 'unshift':
			case 'prepend':
				set.push(`${p} = list_append(${listParam(0)}, ${p})`)
				break

			case 'incr':
				set.push(`${p} = if_not_exists(${p}, ${param(1, { N: '0' })}) + ${param(0)}`)
				break

			case 'decr':
				set.push(`${p} = if_not_exists(${p}, ${param(1, { N: '0' })}) - ${param(0)}`)
				break

			case 'add': {
				const innerPath = `${p}.${attrs.name(SET_KEY)}`
				add.push(`${innerPath} ${innerSetParam()}`)
				break
			}

			case 'remove': {
				const innerPath = `${p}.${attrs.name(SET_KEY)}`
				del.push(`${innerPath} ${innerSetParam()}`)
				break
			}

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
