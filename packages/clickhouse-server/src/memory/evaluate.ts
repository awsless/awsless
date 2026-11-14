import { findAggregate, isAggregate } from './aggregates'
import { Expr, Query } from './ast'
import {
	badArguments,
	ClickHouseException,
	illegalAggregation,
	illegalType,
	notAnAggregate,
	notImplemented,
	unknownFunction,
	unknownIdentifier,
	unknownQueryParameter,
} from './errors'
import { arrayElement, checkArguments, coerceForComparison, findFunction, FunctionContext, truthy } from './functions'
import { columnName } from './naming'
import { castValue, DataType, formatType, parseParam, parseType, stringOf } from './types'
import { compareValues, TupleValue, Value, valueKey } from './values'

export type QueryResult = {
	columns: { name: string; type?: DataType }[]
	rows: Value[][]
}

export type QueryContext = {
	fn: FunctionContext
	params: Record<string, string>
	// The statement text, for error messages.
	text: string
	run: (query: Query, outer?: Scope) => QueryResult
	inferType: (expr: Expr, scope: Scope) => DataType | undefined
	subqueries: Map<Query, QueryResult>
}

// What an expression can see: one row's columns, the select's aliases,
// lambda arguments & - once rows are grouped - the group's keys and
// aggregate results.
export type Scope = {
	query: QueryContext
	columns: Map<string, number>
	types: (DataType | undefined)[]
	row: Value[]
	aliases: Map<string, Expr>
	aliasValues?: Map<string, Value>
	resolving?: Set<string>
	lambdas?: Map<string, Value>
	group?: Group
	arrayJoins?: Map<Expr, Value>
	outer?: Scope
	// Set once a subquery reads a column of this scope: its result then
	// depends on the row & can't be reused.
	correlation?: { used: boolean }
}

export type Group = {
	keys: Map<string, Value>
	aggregates: Map<Expr, Value>
}

const LAZY = new Set(['if', 'multiIf', 'and', 'or', 'caseWithExpression', 'coalesce', 'ifNull'])

// The functions special() handles itself.
const SPECIAL = new Set([
	'arrayJoin',
	'in',
	'notIn',
	'globalIn',
	'globalNotIn',
	'exists',
	'toTypeName',
	'toColumnTypeName',
	'if',
	'multiIf',
	'and',
	'or',
	'coalesce',
	'ifNull',
	'arrayElement',
	'CAST',
	'_CAST',
	'cast',
])

const LAMBDA_FUNCTIONS = new Set([
	'arrayMap',
	'arrayFilter',
	'arrayExists',
	'arrayAll',
	'arrayCount',
	'arraySum',
	'arrayAvg',
	'arrayMin',
	'arrayMax',
	'arrayFirst',
	'arrayLast',
	'arrayFirstIndex',
	'arrayLastIndex',
	'arraySort',
	'arrayReverseSort',
	'arraySplit',
	'arrayFold',
	'arrayCumSum',
])

export const withRow = (scope: Scope, row: Value[]): Scope => ({
	...scope,
	row,
	aliasValues: undefined,
	resolving: undefined,
})

// Finds the aggregate calls in an expression, not looking into lambdas or
// subqueries, which aggregate on their own.
export const collectAggregates = (expr: Expr, found: Expr[] = [], inside = false): Expr[] => {
	if (expr.kind === 'function') {
		if (!expr.over && isAggregateCall(expr)) {
			if (inside) {
				throw illegalAggregation(
					`Aggregate function ${columnName(expr)} is found inside another aggregate function in query`
				)
			}

			found.push(expr)
			expr.args.forEach(arg => collectAggregates(arg, [], true))
			return found
		}

		expr.args.forEach(arg => collectAggregates(arg, found, inside))
		expr.params?.forEach(param => collectAggregates(param, found, inside))
	}

	return found
}

export const isAggregateCall = (expr: Expr) => {
	return expr.kind === 'function' && (expr.distinct === true || isAggregate(expr.name)) && !findFunction(expr.name)
}

export const containsAggregate = (expr: Expr) => collectAggregates(expr).length > 0

const paramValue = (expr: Extract<Expr, { kind: 'param' }>, scope: Scope): Value => {
	const text = scope.query.params[expr.name]

	if (text === undefined) {
		throw unknownQueryParameter(`Substitution \`${expr.name}\` is not set`)
	}

	return parseParam(text, parseType(expr.type))
}

// A value inside a JSON, Map or Tuple column, like details.os.
const pathValue = (value: Value, path: string[]): Value | undefined => {
	let current: unknown = value

	for (const part of path) {
		if (current instanceof TupleValue) {
			const index = current.names?.indexOf(part) ?? -1
			if (index === -1) return undefined
			current = current.items[index]
		} else if (current instanceof Map) {
			current = current.get(part)
		} else if (current !== null && typeof current === 'object' && !Array.isArray(current)) {
			current = (current as Record<string, unknown>)[part]
			if (current === undefined) return null
		} else {
			return undefined
		}
	}

	return current as Value
}

// Per node caches, so a million rows don't rebuild the same strings or
// look up the same function a million times.
const names = new WeakMap<Expr, string>()
const functionsOf = new WeakMap<Expr, ReturnType<typeof findFunction> | null>()

const nameOf = (expr: Expr) => {
	let name = names.get(expr)

	if (name === undefined) {
		name = columnName(expr)
		names.set(expr, name)
	}

	return name
}

const resolveIdentifier = (expr: Extract<Expr, { kind: 'identifier' }>, scope: Scope): Value => {
	const name = nameOf(expr)

	if (expr.parts.length === 1 && scope.lambdas?.has(name)) {
		return scope.lambdas.get(name)!
	}

	// An alias wins over a column of the same name, except inside its own
	// definition, where the column is meant.
	if (expr.parts.length === 1 && scope.aliases.has(name) && !scope.resolving?.has(name)) {
		const cached = scope.aliasValues?.get(name)

		if (cached !== undefined) {
			return cached
		}

		const resolving = new Set(scope.resolving)
		resolving.add(name)

		const value = evaluate(scope.aliases.get(name)!, { ...scope, resolving })

		if (!scope.group) {
			scope.aliasValues ??= new Map()
			scope.aliasValues.set(name, value)
		}

		return value
	}

	const index = scope.columns.get(name)

	if (index !== undefined) {
		if (scope.group) {
			throw notAnAggregate(
				`Column '${name}' is not under aggregate function and not in GROUP BY keys. In query ${scope.query.text}`
			)
		}

		return scope.row[index]!
	}

	// A path into a JSON, Map or Tuple column, qualified by its table or not.
	for (let split = expr.parts.length - 1; split >= 1; split--) {
		const column = expr.parts.slice(0, split).join('.')
		const position = scope.columns.get(column)

		if (position !== undefined) {
			if (scope.group) {
				throw notAnAggregate(
					`Column '${column}' is not under aggregate function and not in GROUP BY keys. In query ${scope.query.text}`
				)
			}

			const value = pathValue(scope.row[position]!, expr.parts.slice(split))

			if (value !== undefined) {
				return value
			}
		}
	}

	if (scope.outer) {
		if (scope.outer.correlation) scope.outer.correlation.used = true
		return resolveIdentifier(expr, scope.outer)
	}

	throw unknownIdentifier(`Unknown expression identifier \`${name}\` in scope ${scope.query.text}`)
}

const callLambda = (lambda: Expr, values: Value[], scope: Scope): Value => {
	if (lambda.kind !== 'lambda') {
		throw illegalType('The first argument of a higher order function must be a lambda')
	}

	const lambdas = new Map(scope.lambdas)
	lambda.params.forEach((param, index) => lambdas.set(param, values[index] ?? null))

	return evaluate(lambda.body, { ...scope, lambdas })
}

const higherOrder = (name: string, args: Expr[], scope: Scope): Value => {
	const lambda = args[0]!.kind === 'lambda' ? args[0]! : undefined
	const arrays = (lambda ? args.slice(1) : args).map(arg => evaluate(arg, scope))

	if (name === 'arrayFold') {
		const [array, initial] = arrays.length === 2 ? arrays : [arrays[0], arrays.at(-1)]
		return (array as Value[]).reduce<Value>((acc, item) => callLambda(lambda!, [acc, item], scope), initial!)
	}

	for (const array of arrays) {
		if (!Array.isArray(array)) {
			throw illegalType(`Argument for function ${name} must be an array`)
		}
	}

	const items = arrays[0] as Value[]
	const apply = (index: number) =>
		lambda
			? callLambda(
					lambda,
					arrays.map(array => (array as Value[])[index]!),
					scope
				)
			: items[index]!
	const mapped = items.map((_, index) => apply(index))

	switch (name) {
		case 'arrayMap':
			return mapped
		case 'arrayFilter':
			return items.filter((_, index) => truthy(mapped[index]!))
		case 'arrayExists':
			return mapped.some(truthy) ? 1 : 0
		case 'arrayAll':
			return mapped.every(truthy) ? 1 : 0
		case 'arrayCount':
			return mapped.filter(truthy).length
		case 'arrayFirst':
			return items.find((_, index) => truthy(mapped[index]!)) ?? (typeof items[0] === 'string' ? '' : 0)
		case 'arrayLast':
			return items.findLast((_, index) => truthy(mapped[index]!)) ?? (typeof items[0] === 'string' ? '' : 0)
		case 'arrayFirstIndex':
			return mapped.findIndex(truthy) + 1
		case 'arrayLastIndex':
			return mapped.findLastIndex(truthy) + 1
		case 'arraySum':
			return mapped.reduce<number>((sum, value) => sum + Number(value), 0)
		case 'arrayAvg':
			return mapped.length === 0
				? NaN
				: mapped.reduce<number>((sum, value) => sum + Number(value), 0) / mapped.length
		case 'arrayMin':
			return mapped.length === 0
				? 0
				: mapped.reduce((best, value) => (compareValues(value, best) < 0 ? value : best))
		case 'arrayMax':
			return mapped.length === 0
				? 0
				: mapped.reduce((best, value) => (compareValues(value, best) > 0 ? value : best))
		case 'arrayCumSum': {
			let sum = 0
			return mapped.map(value => (sum += Number(value)))
		}
		case 'arraySort':
		case 'arrayReverseSort': {
			const order = items.map((item, index) => ({ item, key: mapped[index]! }))
			order.sort((a, b) => (name === 'arraySort' ? compareValues(a.key, b.key) : compareValues(b.key, a.key)))
			return order.map(entry => entry.item)
		}
		case 'arraySplit': {
			const parts: Value[][] = []
			items.forEach((item, index) => {
				if (index === 0 || truthy(mapped[index]!)) parts.push([])
				parts.at(-1)!.push(item)
			})
			return parts
		}
	}

	throw unknownFunction(`Function with name \`${name}\` does not exist`)
}

// A subquery runs once & its result is kept for every row, unless it read
// the row it ran in - then each row gets its own.
const runSubquery = (query: Query, scope: Scope): QueryResult => {
	const cached = scope.query.subqueries.get(query)

	if (cached) {
		return cached
	}

	const correlation = { used: false }
	const result = scope.query.run(query, { ...scope, correlation })

	if (!correlation.used) {
		scope.query.subqueries.set(query, result)
	}

	return result
}

// The right side of IN: a subquery's first column, a tuple, an array or a
// single value.
const inSet = (expr: Expr, scope: Scope): Value[] => {
	if (expr.kind === 'subquery') {
		const correlation = { used: false }
		const result = scope.query.subqueries.get(expr.query) ?? scope.query.run(expr.query, { ...scope, correlation })

		// ClickHouse answers a scalar subquery per row, but not a set.
		if (correlation.used) {
			throw notImplemented('Correlated subqueries are not supported in IN')
		}

		scope.query.subqueries.set(expr.query, result)

		return result.rows.map(row => (row.length === 1 ? row[0]! : new TupleValue(row)))
	}

	const value = evaluate(expr, scope)

	if (value instanceof TupleValue) return value.items
	if (Array.isArray(value) && expr.kind !== 'literal') return value
	if (Array.isArray(value)) return value

	return [value]
}

const contains = (set: Value[], value: Value, ctx: FunctionContext) => {
	if (value === null) return false

	return set.some(item => {
		if (item === null) return false
		if (value instanceof TupleValue && item instanceof TupleValue) return valueKey(value) === valueKey(item)
		const [a, b] = coerceForComparison(value, item, ctx)
		return compareValues(a, b) === 0
	})
}

const special = (expr: Extract<Expr, { kind: 'function' }>, scope: Scope): { value: Value } | undefined => {
	const { name, args } = expr

	switch (name) {
		case 'arrayJoin': {
			const value = scope.arrayJoins?.get(expr)
			if (value === undefined) {
				throw illegalType('arrayJoin can only be used in the SELECT list of the in-memory ClickHouse')
			}
			return { value }
		}
		case 'in':
		case 'notIn':
		case 'globalIn':
		case 'globalNotIn': {
			const value = evaluate(args[0]!, scope)
			const set = inSet(args[1]!, scope)

			if (value === null) return { value: null }

			const found = contains(set, value, scope.query.fn)
			return { value: (name === 'in' || name === 'globalIn') === found ? 1 : 0 }
		}
		case 'exists': {
			const query = (args[0] as Extract<Expr, { kind: 'subquery' }>).query
			return { value: scope.query.run(query, scope).rows.length > 0 ? 1 : 0 }
		}
		case 'toTypeName': {
			const type = scope.query.inferType(args[0]!, scope)
			return { value: type ? formatType(type) : 'String' }
		}
		case 'toColumnTypeName': {
			const type = scope.query.inferType(args[0]!, scope)
			return { value: type ? formatType(type) : 'String' }
		}
		case 'if': {
			if (args.length !== 3) checkArguments(name, findFunction(name)!, args.length)
			const condition = evaluate(args[0]!, scope)
			return { value: evaluate(truthy(condition) ? args[1]! : args[2]!, scope) }
		}
		case 'multiIf': {
			for (let i = 0; i + 1 < args.length; i += 2) {
				if (truthy(evaluate(args[i]!, scope))) return { value: evaluate(args[i + 1]!, scope) }
			}
			return { value: evaluate(args.at(-1)!, scope) }
		}
		case 'and': {
			let unknown = false
			for (const arg of args) {
				const value = evaluate(arg, scope)
				if (value === null) unknown = true
				else if (!truthy(value)) return { value: 0 }
			}
			return { value: unknown ? null : 1 }
		}
		case 'or': {
			let unknown = false
			for (const arg of args) {
				const value = evaluate(arg, scope)
				if (value === null) unknown = true
				else if (truthy(value)) return { value: 1 }
			}
			return { value: unknown ? null : 0 }
		}
		case 'coalesce': {
			for (const arg of args) {
				const value = evaluate(arg, scope)
				if (value !== null) return { value }
			}
			return { value: null }
		}
		case 'ifNull': {
			const value = evaluate(args[0]!, scope)
			return { value: value === null ? evaluate(args[1]!, scope) : value }
		}
		case 'arrayElement': {
			const container = evaluate(args[0]!, scope)
			const index = evaluate(args[1]!, scope)
			if (container === null || index === null) return { value: null }
			return { value: arrayElement(container, index) }
		}
		case 'CAST':
		case '_CAST':
		case 'cast': {
			const value = evaluate(args[0]!, scope)
			const type = stringOf(evaluate(args[1]!, scope))
			return { value: castValue(value, parseType(type)) }
		}
	}

	if (LAMBDA_FUNCTIONS.has(name) && args.some(arg => arg.kind === 'lambda')) {
		return { value: higherOrder(name, args, scope) }
	}

	if (LAZY.has(name)) {
		return undefined
	}

	return undefined
}

export const evaluate = (expr: Expr, scope: Scope): Value => {
	if (scope.group && expr.kind !== 'literal') {
		const name = nameOf(expr)
		const key = scope.group.keys.get(name)

		if (key !== undefined || scope.group.keys.has(name)) {
			return key ?? null
		}
	}

	switch (expr.kind) {
		case 'literal':
			return expr.value as Value
		case 'param':
			return paramValue(expr, scope)
		case 'identifier':
			return resolveIdentifier(expr, scope)
		case 'subquery': {
			const result = runSubquery(expr.query, scope)

			if (result.rows.length > 1) {
				throw new ClickHouseException(
					125,
					'INCORRECT_RESULT_OF_SCALAR_SUBQUERY',
					'Scalar subquery returned more than one row'
				)
			}

			const row = result.rows[0]

			if (!row) return null

			return row.length === 1 ? row[0]! : new TupleValue(row)
		}
		case 'lambda':
			throw badArguments('A lambda can only be an argument of a higher order function')
		case 'asterisk':
			throw badArguments('An asterisk can only stand in the SELECT list or in count(*)')
		case 'function': {
			if (isAggregateCall(expr)) {
				if (!scope.group) {
					throw illegalAggregation(
						`Aggregate function ${columnName(expr)} is found in WHERE or another place that doesn't allow aggregation in query ${scope.query.text}`
					)
				}

				const value = scope.group.aggregates.get(expr)

				if (value === undefined) {
					throw illegalAggregation(
						`Aggregate function ${columnName(expr)} isn't available here in query ${scope.query.text}`
					)
				}

				return value
			}

			if (
				SPECIAL.has(expr.name) ||
				(LAMBDA_FUNCTIONS.has(expr.name) && expr.args.some(arg => arg.kind === 'lambda'))
			) {
				const handled = special(expr, scope)

				if (handled) {
					return handled.value
				}
			}

			let fn = functionsOf.get(expr)

			if (fn === undefined) {
				fn = findFunction(expr.name) ?? null
				functionsOf.set(expr, fn)
			}

			if (!fn) {
				if (findAggregate(expr.name)) {
					throw illegalAggregation(
						`Aggregate function ${expr.name} is found in a place that doesn't allow aggregation`
					)
				}

				throw unknownFunction(
					`Function with name \`${expr.name}\` does not exist. In scope ${scope.query.text}`
				)
			}

			checkArguments(expr.name, fn, expr.args.length)

			const args = expr.args.map(arg => evaluate(arg, scope))

			if (!fn.handlesNull && args.some(arg => arg === null)) {
				return null
			}

			try {
				return fn.call(args, scope.query.fn)
			} catch (error) {
				if (error instanceof ClickHouseException) throw error
				if (error instanceof Error && error.constructor.name === '') {
					throw new ClickHouseException(395, 'FUNCTION_THROW_IF_VALUE_IS_NON_ZERO', error.message)
				}
				throw error
			}
		}
	}
}

export const evaluateBoolean = (expr: Expr, scope: Scope) => truthy(evaluate(expr, scope))
