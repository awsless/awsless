import { createAccumulator } from './aggregates'
import { Expr, Join, Query, Select, TableSource } from './ast'
import { Catalog, Table } from './catalog'
import {
	badArguments,
	ClickHouseException,
	illegalFinal,
	notImplemented,
	unknownFunction,
	unknownTable,
} from './errors'
import {
	collectAggregates,
	containsAggregate,
	evaluate,
	evaluateBoolean,
	Group,
	QueryContext,
	QueryResult,
	Scope,
	withRow,
} from './evaluate'
import { sortWithNullsLast } from './functions'
import { inferType } from './infer'
import { columnName } from './naming'
import { systemTable } from './system'
import { DataType, defaultValue, isNullable, parseType } from './types'
import { compareValues, toNumber, Value, valueKey } from './values'

export type FrameColumn = {
	name: string
	qualifiers: string[]
	type?: DataType
	// MATERIALIZED & ALIAS columns read by name, never through *.
	hidden?: boolean
}

export type Frame = {
	columns: FrameColumn[]
	rows: Value[][]
}

type PipelineRow = {
	values: Value[]
	joins?: Map<Expr, Value>
}

export type Executor = {
	catalog: Catalog
	database: string
}

const lookupOf = (columns: FrameColumn[]) => {
	const lookup = new Map<string, number>()

	columns.forEach((column, index) => {
		for (const qualifier of column.qualifiers) {
			const key = `${qualifier}.${column.name}`
			if (!lookup.has(key)) lookup.set(key, index)
		}
	})

	// Unqualified names last, so a later source never shadows an earlier one.
	columns.forEach((column, index) => {
		if (!lookup.has(column.name)) lookup.set(column.name, index)
	})

	return lookup
}

const scopeOf = (frame: Frame, ctx: QueryContext, aliases: Map<string, Expr>, outer?: Scope): Scope => ({
	query: ctx,
	columns: lookupOf(frame.columns),
	types: frame.columns.map(column => column.type),
	row: [],
	aliases,
	outer,
})

// ---------------------------------------------------------------
// sources

const tableFrame = (table: Table, qualifiers: string[], final: boolean | undefined, ctx: QueryContext): Frame => {
	const visible = table.columns.filter(column => column.defaultKind !== 'EPHEMERAL')
	const frame: Frame = {
		columns: visible.map(column => ({
			name: column.name,
			qualifiers,
			type: column.type,
			hidden: column.defaultKind === 'MATERIALIZED' || column.defaultKind === 'ALIAS',
		})),
		rows: [],
	}

	let rows = table.rows

	if (final) {
		rows = finalRows(table, ctx)
	}

	const aliasColumns = visible
		.map((column, index) => (column.defaultKind === 'ALIAS' ? index : -1))
		.filter(index => index !== -1)

	frame.rows = rows.map(row => visible.map(column => row[column.name] ?? null))

	// ALIAS columns are computed whenever they're read.
	if (aliasColumns.length > 0) {
		const scope = scopeOf(frame, ctx, new Map())

		for (const values of frame.rows) {
			for (const index of aliasColumns) {
				const column = visible[index]!
				values[index] = evaluate(column.defaultExpr!, withRow(scope, values))
			}
		}
	}

	return frame
}

// What a ReplacingMergeTree or SummingMergeTree holds once fully merged.
const finalRows = (table: Table, ctx: QueryContext) => {
	const engine = table.engine.name

	if (engine === 'MergeTree' || !/MergeTree$/.test(engine)) {
		throw illegalFinal(`Storage ${engine} doesn't support FINAL`)
	}

	const frame: Frame = {
		columns: table.columns.map(column => ({ name: column.name, qualifiers: [], type: column.type })),
		rows: [],
	}
	const scope = scopeOf(frame, ctx, new Map())
	const keyOf = (row: Record<string, Value>) => {
		const values = table.columns.map(column => row[column.name] ?? null)
		return table.orderBy.map(expr => valueKey(evaluate(expr, withRow(scope, values)))).join('|')
	}

	const groups = new Map<string, Record<string, Value>[]>()

	for (const row of table.rows) {
		const key = keyOf(row)
		const group = groups.get(key) ?? []
		group.push(row)
		groups.set(key, group)
	}

	if (engine === 'ReplacingMergeTree') {
		const [version, deleted] = table.engine.args.map(arg =>
			arg.kind === 'identifier' ? arg.parts.join('.') : undefined
		)

		return [...groups.values()]
			.map(group => {
				let best = group[0]!

				for (const row of group) {
					if (!version || compareValues(row[version] ?? null, best[version] ?? null) >= 0) best = row
				}

				return best
			})
			.filter(row => !deleted || !row[deleted])
	}

	if (engine === 'SummingMergeTree') {
		const keyColumns = new Set(
			table.orderBy.flatMap(expr => (expr.kind === 'identifier' ? [expr.parts.join('.')] : []))
		)

		return [...groups.values()].map(group => {
			const merged = { ...group[0]! }

			for (const column of table.columns) {
				if (keyColumns.has(column.name)) continue

				const values = group.map(row => row[column.name])

				if (values.every(value => typeof value === 'number' || typeof value === 'bigint')) {
					merged[column.name] = values.reduce<number>((sum, value) => sum + toNumber(value!), 0)
				}
			}

			return merged
		})
	}

	throw notImplemented(`FINAL for ${engine} is not supported by the in-memory ClickHouse`)
}

const tableFunctionFrame = (
	source: Extract<TableSource, { kind: 'function' }>,
	ctx: QueryContext,
	outer?: Scope
): Frame => {
	const scope: Scope = { query: ctx, columns: new Map(), types: [], row: [], aliases: new Map(), outer }
	const args = source.args.map(arg => evaluate(arg, scope))
	const qualifiers = source.alias ? [source.alias] : []

	switch (source.name) {
		case 'numbers':
		case 'numbers_mt': {
			const [start, count] =
				args.length === 1 ? [0, toNumber(args[0]!)] : [toNumber(args[0]!), toNumber(args[1]!)]
			if (count > 10_000_000)
				throw badArguments('numbers() in the in-memory ClickHouse is limited to 10 million rows')
			return {
				columns: [{ name: 'number', qualifiers, type: parseType('UInt64') }],
				rows: Array.from({ length: count }, (_, index) => [start + index]),
			}
		}
		case 'zeros':
		case 'zeros_mt':
			return {
				columns: [{ name: 'zero', qualifiers, type: parseType('UInt8') }],
				rows: Array.from({ length: toNumber(args[0]!) }, () => [0]),
			}
		case 'generate_series':
		case 'generateSeries': {
			const [start, stop, step = 1] = args.map(toNumber)
			const rows: Value[][] = []
			for (let value = start!; value <= stop!; value += step) rows.push([value])
			return { columns: [{ name: 'generate_series', qualifiers, type: parseType('UInt64') }], rows }
		}
		case 'values': {
			const structure =
				typeof args[0] === 'string' && source.args[0]?.kind === 'literal' && /\s/.test(args[0])
					? args[0]
					: undefined
			const values = structure ? args.slice(1) : args
			const types = structure
				? structure.split(',').map(part => {
						const [name, ...type] = part.trim().split(/\s+/)
						return { name: name!, type: parseType(type.join(' ')) }
					})
				: undefined

			const rows = values.map(value =>
				value && typeof value === 'object' && 'items' in (value as object)
					? (value as { items: Value[] }).items
					: [value]
			)
			const width = rows[0]?.length ?? 0

			return {
				columns: (
					types ?? Array.from({ length: width }, (_, index) => ({ name: `c${index + 1}`, type: undefined }))
				).map(column => ({ name: column.name, qualifiers, type: column.type })),
				rows,
			}
		}
	}

	throw unknownFunction(`Unknown table function ${source.name}`)
}

const sourceFrame = (
	source: TableSource,
	executor: Executor,
	ctx: QueryContext,
	ctes: Map<string, Query>,
	outer?: Scope
): Frame => {
	if (source.kind === 'subquery') {
		const result = runQuery(source.query, executor, ctx, outer, ctes)
		return {
			columns: result.columns.map(column => ({
				name: column.name,
				qualifiers: source.alias ? [source.alias] : [],
				type: column.type,
			})),
			rows: result.rows,
		}
	}

	if (source.kind === 'function') {
		return tableFunctionFrame(source, ctx, outer)
	}

	const param = (source as { param?: string }).param
	const name = param ? (ctx.params[param] ?? '') : source.name
	const [database, table] =
		param && name.includes('.')
			? (name.split('.', 2) as [string, string])
			: [source.database ?? executor.database, name]

	if (!source.database && !param && ctes.has(table)) {
		const result = runQuery(ctes.get(table)!, executor, ctx, outer, ctes)
		return {
			columns: result.columns.map(column => ({
				name: column.name,
				qualifiers: [source.alias ?? table],
				type: column.type,
			})),
			rows: result.rows,
		}
	}

	if (database === 'system' || database === 'information_schema' || database === 'INFORMATION_SCHEMA') {
		const system = systemTable(table, executor.catalog, ctx)

		if (!system) {
			throw unknownTable(`Unknown table expression identifier '${database}.${table}' in scope ${ctx.text}`)
		}

		return {
			columns: system.columns.map(column => ({
				name: column.name,
				qualifiers: source.alias ? [source.alias] : [table, `${database}.${table}`],
				type: column.type,
			})),
			rows: system.rows,
		}
	}

	const found = executor.catalog.get(database, table, ctx.text)
	const qualifiers = source.alias ? [source.alias] : [table, `${database}.${table}`]

	return tableFrame(found, qualifiers, source.final, ctx)
}

// ---------------------------------------------------------------
// joins

const defaultsFor = (columns: FrameColumn[]) =>
	columns.map(column => (column.type ? (isNullable(column.type) ? null : defaultValue(column.type)) : null))

const sideOf = (
	expr: Expr,
	left: Map<string, number>,
	right: Map<string, number>
): 'left' | 'right' | 'both' | 'none' => {
	if (expr.kind === 'identifier') {
		const name = expr.parts.join('.')
		const inLeft = left.has(name)
		const inRight = right.has(name)
		if (inLeft && !inRight) return 'left'
		if (inRight && !inLeft) return 'right'
		// A qualified name that both sides know resolves to the left one.
		return inLeft ? 'left' : 'none'
	}

	if (expr.kind === 'function') {
		const sides = new Set(expr.args.map(arg => sideOf(arg, left, right)).filter(side => side !== 'none'))
		if (sides.size === 0) return 'none'
		if (sides.size === 1) return [...sides][0]!
		return 'both'
	}

	return 'none'
}

const conjuncts = (expr: Expr): Expr[] =>
	expr.kind === 'function' && expr.name === 'and' ? expr.args.flatMap(conjuncts) : [expr]

const joinFrames = (left: Frame, right: Frame, join: Join, ctx: QueryContext, aliases: Map<string, Expr>): Frame => {
	const rightColumns = right.columns.map(column => {
		const clash = left.columns.some(other => other.name === column.name)
		return clash ? { ...column, name: column.qualifiers[0] ? column.name : column.name, renamed: true } : column
	})

	const using = join.using ?? []
	const usingRight = new Set(using.map(name => right.columns.findIndex(column => column.name === name)))
	const usingLeft = using.map(name => left.columns.findIndex(column => column.name === name))

	for (const [index, name] of using.entries()) {
		if (usingLeft[index] === -1 || [...usingRight][index] === -1) {
			throw new ClickHouseException(47, 'UNKNOWN_IDENTIFIER', `Cannot find column ${name} in the USING clause`)
		}
	}

	const keptRight = rightColumns.map((_, index) => index).filter(index => !usingRight.has(index))
	const columns: FrameColumn[] = [...left.columns, ...keptRight.map(index => rightColumns[index]!)]
	const combined = (l: Value[], r: Value[]) => [...l, ...keptRight.map(index => r[index]!)]

	const leftDefaults = defaultsFor(left.columns)
	const rightDefaults = defaultsFor(right.columns)
	const rows: Value[][] = []

	if (join.kind === 'CROSS') {
		for (const l of left.rows) for (const r of right.rows) rows.push(combined(l, r))
		return { columns, rows }
	}

	// The pairs that match, through a hash of the equality keys when the
	// condition is only equalities between the two sides.
	const matches: Map<number, number[]> = new Map()
	const leftScope = scopeOf(left, ctx, aliases)
	const rightScope = scopeOf(right, ctx, aliases)

	if (using.length > 0) {
		const index = new Map<string, number[]>()

		// A NULL key matches nothing, not even another NULL.
		right.rows.forEach((r, i) => {
			const values = [...usingRight].map(position => r[position] as Value)
			if (values.includes(null)) return
			const key = values.map(valueKey).join('|')
			index.set(key, [...(index.get(key) ?? []), i])
		})

		left.rows.forEach((l, i) => {
			const values = usingLeft.map(position => l[position] as Value)
			matches.set(i, values.includes(null) ? [] : (index.get(values.map(valueKey).join('|')) ?? []))
		})
	} else if (join.on) {
		const parts = conjuncts(join.on)
		const equalities = parts.map(part => {
			if (part.kind !== 'function' || part.name !== 'equals') return undefined
			const [a, b] = part.args as [Expr, Expr]
			const sideA = sideOf(a, leftScope.columns, rightScope.columns)
			const sideB = sideOf(b, leftScope.columns, rightScope.columns)
			if (sideA === 'left' && sideB === 'right') return { left: a, right: b }
			if (sideA === 'right' && sideB === 'left') return { left: b, right: a }
			return undefined
		})

		if (equalities.every(Boolean) && equalities.length > 0) {
			const index = new Map<string, number[]>()

			right.rows.forEach((r, i) => {
				const scope = withRow(rightScope, r)
				const values = equalities.map(eq => evaluate(eq!.right, scope))
				if (values.includes(null)) return
				const key = values.map(valueKey).join('|')
				index.set(key, [...(index.get(key) ?? []), i])
			})

			left.rows.forEach((l, i) => {
				const scope = withRow(leftScope, l)
				const values = equalities.map(eq => evaluate(eq!.left, scope))
				matches.set(i, values.includes(null) ? [] : (index.get(values.map(valueKey).join('|')) ?? []))
			})
		} else {
			const pairScope = scopeOf({ columns: [...left.columns, ...rightColumns], rows: [] }, ctx, aliases)

			left.rows.forEach((l, i) => {
				matches.set(
					i,
					right.rows
						.map((_, j) => j)
						.filter(j => evaluateBoolean(join.on!, withRow(pairScope, [...l, ...right.rows[j]!])))
				)
			})
		}
	} else {
		throw badArguments('A JOIN needs an ON or USING clause')
	}

	const matchedRight = new Set<number>()

	left.rows.forEach((l, i) => {
		let found = matches.get(i) ?? []

		if (join.strictness === 'ANY') found = found.slice(0, 1)

		for (const j of found) {
			matchedRight.add(j)
			rows.push(combined(l, right.rows[j]!))
		}

		if (found.length === 0 && (join.kind === 'LEFT' || join.kind === 'FULL')) {
			rows.push(combined(l, rightDefaults))
		}
	})

	if (join.kind === 'RIGHT' || join.kind === 'FULL') {
		right.rows.forEach((r, j) => {
			if (matchedRight.has(j)) return

			const l = [...leftDefaults]
			// The USING columns of an unmatched right row take its values.
			using.forEach((_, index) => {
				l[usingLeft[index]!] = r[[...usingRight][index]!]!
			})

			rows.push(combined(l, r))
		})
	}

	return { columns, rows }
}

// ---------------------------------------------------------------
// select

const expandAsterisks = (columns: Expr[], frame: Frame): Expr[] => {
	return columns.flatMap(expr => {
		if (expr.kind !== 'asterisk') return [expr]

		const wanted = frame.columns.filter(
			column =>
				!column.hidden &&
				(!expr.table || column.qualifiers.includes(expr.table)) &&
				!expr.except?.includes(column.name)
		)
		const seen = new Set<string>()

		return wanted.map(column => {
			const duplicate = seen.has(column.name)
			seen.add(column.name)
			const qualifier = column.qualifiers[0]

			// A second column of the same name, from the right side of a join,
			// reads qualified & is named that way.
			if (duplicate && qualifier) {
				return {
					kind: 'identifier' as const,
					parts: [qualifier, column.name],
					alias: `${qualifier}.${column.name}`,
				}
			}

			return { kind: 'identifier' as const, parts: [column.name] }
		})
	})
}

const positional = (expr: Expr, columns: Expr[]): Expr => {
	if (expr.kind === 'literal' && typeof expr.value === 'number' && Number.isInteger(expr.value) && !expr.alias) {
		const column = columns[expr.value - 1]

		if (!column) {
			throw badArguments(`Positional argument out of bounds: ${expr.value}`)
		}

		return column.alias ? { kind: 'identifier', parts: [column.alias] } : column
	}

	return expr
}

const findArrayJoins = (expr: Expr, found: Extract<Expr, { kind: 'function' }>[] = []) => {
	if (expr.kind === 'function') {
		if (expr.name === 'arrayJoin') {
			found.push(expr)
			return found
		}

		expr.args.forEach(arg => findArrayJoins(arg, found))
	}

	return found
}

const compareRows = (a: Value[], b: Value[], directions: { direction: 'ASC' | 'DESC'; nulls?: 'FIRST' | 'LAST' }[]) => {
	for (let i = 0; i < directions.length; i++) {
		const { direction, nulls = 'LAST' } = directions[i]!
		const x = a[i]!
		const y = b[i]!
		const xNull = x === null
		const yNull = y === null
		const xNaN = typeof x === 'number' && Number.isNaN(x)
		const yNaN = typeof y === 'number' && Number.isNaN(y)

		// Values, then NaN, then NULL - or the reverse with NULLS FIRST -
		// whichever the direction.
		const rank = (isNull: boolean, isNaN: boolean) => (isNull ? 2 : isNaN ? 1 : 0)
		const rx = rank(xNull, xNaN)
		const ry = rank(yNull, yNaN)

		if (rx !== ry) {
			return nulls === 'FIRST' ? ry - rx : rx - ry
		}

		if (rx !== 0) continue

		const result = compareValues(x, y)

		if (result !== 0) {
			return direction === 'DESC' ? -result : result
		}
	}

	return 0
}

const runSelect = (
	select: Select,
	executor: Executor,
	ctx: QueryContext,
	outer: Scope | undefined,
	parentCtes: Map<string, Query>
): QueryResult => {
	const ctes = new Map(parentCtes)
	const aliases = new Map<string, Expr>()

	for (const item of select.with) {
		if (item.query) ctes.set(item.name, item.query)
		else aliases.set(item.name, item.expr!)
	}

	// FROM & JOINs.
	let frame: Frame = select.from
		? sourceFrame(select.from, executor, ctx, ctes, outer)
		: { columns: [{ name: 'dummy', qualifiers: ['system.one', 'one'], type: parseType('UInt8') }], rows: [[0]] }

	for (const item of select.columns) {
		if (item.alias) aliases.set(item.alias, item)
	}

	for (const join of select.joins) {
		frame = joinFrames(frame, sourceFrame(join.source, executor, ctx, ctes, outer), join, ctx, aliases)
	}

	const columns = expandAsterisks(select.columns, frame)

	for (const item of columns) {
		if (item.alias) aliases.set(item.alias, item)
	}

	// ARRAY JOIN expands each row into one per array element.
	if (select.arrayJoin) {
		frame = arrayJoinFrame(frame, select.arrayJoin, ctx, aliases, outer)

		for (const expr of select.arrayJoin.exprs) {
			if (expr.alias) aliases.delete(expr.alias)
		}
	}

	const scope = scopeOf(frame, ctx, aliases, outer)
	let rows: PipelineRow[] = frame.rows.map(values => ({ values }))

	// arrayJoin() in the select list multiplies the rows too.
	const arrayJoins = columns.flatMap(column => findArrayJoins(column))

	if (arrayJoins.length > 0) {
		rows = rows.flatMap(row => {
			const rowScope = withRow(scope, row.values)
			let combinations: Map<Expr, Value>[] = [new Map()]

			for (const call of arrayJoins) {
				const array = evaluate(call.args[0]!, { ...rowScope, arrayJoins: undefined })

				if (!Array.isArray(array)) {
					throw new ClickHouseException(
						43,
						'ILLEGAL_TYPE_OF_ARGUMENT',
						'Argument for function arrayJoin must be Array'
					)
				}

				combinations = combinations.flatMap(combination =>
					array.map(item => new Map([...combination, [call, item]]))
				)
			}

			return combinations.map(joins => ({ values: row.values, joins }))
		})
	}

	const rowScope = (row: PipelineRow): Scope => ({
		...scope,
		row: row.values,
		aliasValues: undefined,
		resolving: undefined,
		arrayJoins: row.joins,
	})

	// Loops that don't keep a row's scope share one, refilled per row.
	const shared: Scope = { ...scope }
	const reuse = (row: PipelineRow) => {
		shared.row = row.values
		shared.arrayJoins = row.joins
		shared.aliasValues = undefined
		return shared
	}

	if (select.prewhere) rows = rows.filter(row => evaluateBoolean(select.prewhere!, reuse(row)))
	if (select.where) rows = rows.filter(row => evaluateBoolean(select.where!, reuse(row)))

	const orderBy = select.orderBy.flatMap(item => {
		if (item.expr.kind === 'asterisk') {
			return columns.map(column => ({
				...item,
				expr: column.alias ? ({ kind: 'identifier', parts: [column.alias] } as Expr) : column,
			}))
		}

		return [{ ...item, expr: positional(item.expr, columns) }]
	})

	const groupBy =
		select.groupBy.length === 1 && select.groupBy[0]!.kind === 'asterisk'
			? columns.filter(column => !containsAggregate(column))
			: select.groupBy.map(expr => positional(expr, columns))

	const aggregating =
		groupBy.length > 0 ||
		columns.some(containsAggregate) ||
		(select.having !== undefined && containsAggregate(select.having)) ||
		orderBy.some(item => containsAggregate(item.expr))

	type Output = { scope: Scope; values: Value[] }
	let outputs: Output[]

	if (aggregating) {
		const aggregates = [
			...columns,
			...(select.having ? [select.having] : []),
			...orderBy.map(item => item.expr),
			...aliases.values(),
		]
			.flatMap(expr => collectAggregates(expr))
			.filter((expr, index, all) => all.indexOf(expr) === index)

		type GroupState = { keys: Value[]; accumulators: ReturnType<typeof createAccumulator>[] }
		const groups = new Map<string, GroupState>()

		const newGroup = (keys: Value[]): GroupState => ({
			keys,
			accumulators: aggregates.map(expr => {
				const call = expr as Extract<Expr, { kind: 'function' }>
				const params = (call.params ?? []).map(param => evaluate(param, scope))
				const nullable = call.args.some(arg => {
					const type = inferType(arg, scope)
					return type !== undefined && isNullable(type)
				})

				return createAccumulator(
					call.distinct && call.name === 'count' ? 'uniqExact' : call.name,
					params,
					call.args.length,
					call.distinct === true && call.name !== 'count',
					nullable
				)
			}),
		})

		for (const row of rows) {
			const current = reuse(row)
			const keys = groupBy.map(expr => evaluate(expr, current))
			const id = keys.length === 1 ? valueKey(keys[0]!) : keys.map(valueKey).join('\u0000')
			let group = groups.get(id)

			if (!group) {
				group = newGroup(keys)
				groups.set(id, group)
			}

			aggregates.forEach((expr, index) => {
				const call = expr as Extract<Expr, { kind: 'function' }>
				group!.accumulators[index]!.add(call.args.map(arg => evaluate(arg, current)))
			})
		}

		// Aggregating no rows without GROUP BY still answers one row.
		if (groups.size === 0 && groupBy.length === 0) {
			groups.set('', newGroup([]))
		}

		// The names a group key answers to: as written, through its alias, &
		// every name of the column it reads.
		const keyNames = groupBy.map(expr => {
			const names = new Set([columnName(expr)])

			if (expr.kind === 'identifier') {
				const name = expr.parts.join('.')
				const alias = aliases.get(name)

				if (alias && expr.parts.length === 1) {
					names.add(columnName({ ...alias, alias: undefined }))
				}

				const index = scope.columns.get(name)

				if (index !== undefined) {
					for (const [key, position] of scope.columns) {
						if (position === index) names.add(key)
					}
				}
			}

			for (const column of columns) {
				if (column.alias && columnName({ ...column, alias: undefined }) === columnName(expr))
					names.add(column.alias)
			}

			return [...names]
		})

		outputs = []

		for (const group of groups.values()) {
			const keys = new Map<string, Value>()
			keyNames.forEach((names, index) => names.forEach(name => keys.set(name, group.keys[index]!)))

			const results = new Map<Expr, Value>()
			aggregates.forEach((expr, index) => {
				let value = group.accumulators[index]!.result()

				if (value === null) {
					const type = inferType(expr, scope)
					if (type && !isNullable(type)) value = defaultValue(type)
				}

				results.set(expr, value)
			})

			const groupScope: Scope = { ...scope, row: [], group: { keys, aggregates: results } satisfies Group }

			if (select.having && !evaluateBoolean(select.having, groupScope)) {
				continue
			}

			outputs.push({ scope: groupScope, values: columns.map(column => evaluate(column, groupScope)) })
		}
	} else {
		if (select.having) {
			throw new ClickHouseException(215, 'NOT_AN_AGGREGATE', 'HAVING without aggregation or GROUP BY')
		}

		outputs = rows.map(row => {
			const current = rowScope(row)
			return { scope: current, values: columns.map(column => evaluate(column, current)) }
		})
	}

	// ORDER BY, DISTINCT, LIMIT BY & LIMIT.
	if (orderBy.length > 0) {
		const keyed = outputs.map((output, index) => ({
			output,
			index,
			keys: orderBy.map(item => evaluate(item.expr, output.scope)),
		}))
		keyed.sort((a, b) => compareRows(a.keys, b.keys, orderBy) || a.index - b.index)
		outputs = keyed.map(entry => entry.output)
	}

	if (select.distinct) {
		const seen = new Set<string>()
		outputs = outputs.filter(output => {
			const key = output.values.map(valueKey).join('\u0000')
			if (seen.has(key)) return false
			seen.add(key)
			return true
		})
	}

	if (select.limitBy) {
		const { limit, offset, exprs } = select.limitBy
		const counts = new Map<string, number>()

		outputs = outputs.filter(output => {
			const key = exprs.map(expr => valueKey(evaluate(positional(expr, columns), output.scope))).join('\u0000')
			const count = counts.get(key) ?? 0
			counts.set(key, count + 1)
			return count >= offset && count < offset + limit
		})
	}

	const offset = select.offset ?? 0
	outputs = outputs.slice(offset, select.limit === undefined ? undefined : offset + select.limit)

	// A column read through its table, like o.id, is named by the column alone.
	const outputName = (column: Expr) => {
		if (column.alias) return column.alias

		if (column.kind === 'identifier' && column.parts.length > 1) {
			const index = scope.columns.get(column.parts.join('.'))
			const found = index === undefined ? undefined : frame.columns[index]
			if (found && found.qualifiers.includes(column.parts.slice(0, -1).join('.'))) return found.name
		}

		return columnName(column)
	}

	return {
		columns: columns.map(column => ({ name: outputName(column), type: inferType(column, scope) })),
		rows: outputs.map(output => output.values),
	}
}

const arrayJoinFrame = (
	frame: Frame,
	arrayJoin: NonNullable<Select['arrayJoin']>,
	ctx: QueryContext,
	aliases: Map<string, Expr>,
	outer?: Scope
): Frame => {
	const scope = scopeOf(frame, ctx, aliases, outer)
	const added = arrayJoin.exprs.map(expr => {
		const name = expr.alias ?? (expr.kind === 'identifier' ? expr.parts.at(-1)! : columnName(expr))
		const type = inferType(expr, scope)
		return { name, type: type?.name === 'Array' ? type.inner : undefined }
	})

	// An array joined without an alias replaces its own column.
	const columns: FrameColumn[] = [
		...added.map(column => ({ name: column.name, qualifiers: [], type: column.type })),
		...frame.columns.map(column =>
			added.some(item => item.name === column.name) && !arrayJoin.exprs.some(expr => expr.alias === column.name)
				? { ...column, name: `\u0000${column.name}` }
				: column
		),
	]

	const rows: Value[][] = []

	for (const values of frame.rows) {
		const rowScope = withRow(scope, values)
		const arrays = arrayJoin.exprs.map(expr => evaluate({ ...expr, alias: undefined }, rowScope))

		for (const array of arrays) {
			if (!Array.isArray(array)) {
				throw new ClickHouseException(53, 'TYPE_MISMATCH', 'ARRAY JOIN requires array argument')
			}
		}

		const lengths = new Set((arrays as Value[][]).map(array => array.length))

		if (lengths.size > 1) {
			throw new ClickHouseException(
				190,
				'SIZES_OF_ARRAYS_DONT_MATCH',
				'Sizes of ARRAY-JOIN-ed arrays do not match'
			)
		}

		const length = (arrays[0] as Value[]).length

		if (length === 0 && arrayJoin.left) {
			rows.push([...added.map(column => (column.type ? defaultValue(column.type) : null)), ...values])
		}

		for (let i = 0; i < length; i++) {
			rows.push([...(arrays as Value[][]).map(array => array[i]!), ...values])
		}
	}

	return { columns, rows }
}

export const runQuery = (
	query: Query,
	executor: Executor,
	ctx: QueryContext,
	outer?: Scope,
	ctes: Map<string, Query> = new Map()
): QueryResult => {
	const results = query.selects.map(select => runSelect(select, executor, ctx, outer, ctes))
	const [first] = results

	for (const result of results.slice(1)) {
		if (result.columns.length !== first!.columns.length) {
			throw new ClickHouseException(
				258,
				'UNION_ALL_RESULT_STRUCTURES_MISMATCH',
				'Different number of columns in UNION elements'
			)
		}
	}

	let rows: Value[][] = first!.rows

	results.slice(1).forEach((result, index) => {
		rows = [...rows, ...result.rows]

		if (query.distinct[index]) {
			const seen = new Set<string>()
			rows = rows.filter(row => {
				const key = row.map(valueKey).join('\u0000')
				if (seen.has(key)) return false
				seen.add(key)
				return true
			})
		}
	})

	return { columns: first!.columns, rows }
}

export { sortWithNullsLast }
