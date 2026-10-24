import { AlterAction, ColumnDef, Expr, Query, Statement } from './ast'
import { Catalog, Column, createTableQuery, Row, Table, toColumn } from './catalog'
import {
	alterForbidden,
	badArguments,
	ClickHouseException,
	duplicateColumn,
	emptyQuery,
	noSuchColumn,
	notImplemented,
	unknownQueryParameter,
} from './errors'
import { evaluate, evaluateBoolean, QueryContext, QueryResult, Scope, withRow } from './evaluate'
import { FunctionContext } from './functions'
import { inferType } from './infer'
import { InputRow, parseInput } from './input'
import { columnName, quoteIdentifier, sql } from './naming'
import { parseStatement } from './parser'
import { Frame, FrameColumn, runQuery } from './select'
import { defaultSetting } from './system'
import {
	castValue,
	DataType,
	defaultValue,
	formatType,
	fromJson,
	isNullable,
	parseParam,
	parseType,
	unwrap,
} from './types'
import { compareValues, DateTimeValue, DateValue, TupleValue, Value, valueKey } from './values'

export type ExecuteOptions = {
	params?: Record<string, string>
	settings?: Record<string, unknown>
	// The http body of an insert, after the statement's own inline data.
	data?: string
	database?: string
}

export type ExecuteResult = {
	result?: QueryResult
	format?: string
	settings: Record<string, unknown>
	writtenRows: number
	readRows: number
}

const MERGE_TREE = /MergeTree$/

const NON_DETERMINISTIC = new Set([
	'now',
	'now64',
	'today',
	'yesterday',
	'rand',
	'rand32',
	'rand64',
	'randCanonical',
	'generateUUIDv4',
	'UUIDv4',
])

// A TTL has to give every row the same expiry on every merge.
const checkTtl = (expr: Expr | undefined) => {
	const visit = (node: Expr) => {
		if (node.kind !== 'function') return

		if (NON_DETERMINISTIC.has(node.name)) {
			throw badArguments(
				`TTL expression cannot contain non-deterministic functions, but contains function ${node.name}`
			)
		}

		node.args.forEach(visit)
	}

	if (expr) visit(expr)
}
const STORAGE_ENGINES = new Set(['Memory', 'Log', 'TinyLog', 'StripeLog', 'Null', 'Set'])

// INSERT ... FORMAT name is followed by data, which never goes through
// the SQL tokenizer.
const INSERT_FORMAT = /^\s*INSERT\s+INTO\s+[\s\S]*?\bFORMAT\s+([A-Za-z]+)[ \t]*\r?\n?/i

const literalText = (value: Value): string => {
	if (value === null) return 'NULL'
	if (value instanceof DateTimeValue)
		return value.scale > 0 ? (value.ms / 1000).toFixed(value.scale) : String(Math.floor(value.ms / 1000))
	if (value instanceof DateValue) return String(value.days)
	if (typeof value === 'string') return `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`
	if (Array.isArray(value)) return `[${value.map(literalText).join(', ')}]`
	if (value instanceof TupleValue) return `(${value.items.map(literalText).join(', ')})`
	return String(value)
}

// Query parameters become literals before anything runs, like ClickHouse
// substitutes them - including their names as result columns.
const substitute = <T>(node: T, params: Record<string, string>): T => {
	if (Array.isArray(node)) {
		return node.map(item => substitute(item, params)) as T
	}

	if (node === null || typeof node !== 'object') {
		return node
	}

	const record = node as Record<string, unknown>

	if (record.kind === 'literal') {
		return node
	}

	if (record.kind === 'param') {
		const { name, type, alias } = record as { name: string; type: string; alias?: string }
		const text = params[name]

		if (text === undefined) {
			throw unknownQueryParameter(`Substitution \`${name}\` is not set`)
		}

		if (type === 'Identifier') {
			return { kind: 'identifier', parts: text.split('.'), alias } as T
		}

		const parsed = parseType(type)
		const value = parseParam(text, parsed)
		const formatted = formatType(parsed)

		// A String parameter is a plain literal, others a _CAST of one - the
		// way ClickHouse substitutes them, & so names their columns.
		if (formatted === 'String') {
			return { kind: 'literal', value, text: literalText(value), alias } as T
		}

		return {
			kind: 'function',
			name: '_CAST',
			args: [
				{ kind: 'literal', value, text: literalText(value) },
				{ kind: 'literal', value: formatted, text: literalText(formatted) },
			],
			alias,
		} as T
	}

	if (record.kind !== 'param' && typeof record.param === 'string' && 'name' in record) {
		const text = params[record.param]

		if (text === undefined) {
			throw unknownQueryParameter(`Substitution \`${record.param}\` is not set`)
		}

		const [database, name] = text.includes('.') ? text.split('.', 2) : [undefined, text]
		return { ...record, param: undefined, database, name } as T
	}

	return Object.fromEntries(Object.entries(record).map(([key, value]) => [key, substitute(value, params)])) as T
}

export class Engine {
	readonly catalog = new Catalog()
	private mutationCount = 0

	reset() {
		this.catalog.clear()
	}

	execute(text: string, options: ExecuteOptions = {}): ExecuteResult {
		const params = options.params ?? {}
		let data: string | undefined
		let statementText = text

		const insert = INSERT_FORMAT.exec(text)

		if (insert) {
			statementText = text.slice(0, insert.index + insert[0].length).trimEnd()
			data = text.slice(insert.index + insert[0].length)
		}

		if (statementText.trim() === '') {
			throw emptyQuery('Empty query')
		}

		const parsed = substitute(parseStatement(statementText), params)
		const settings: Record<string, unknown> = { ...options.settings }

		if ('settings' in parsed && !Array.isArray(parsed.settings)) {
			Object.assign(settings, parsed.settings)
		}

		const database = options.database ?? 'default'
		const ctx = this.context(settings, params, database, parsed.kind === 'query' ? parsed.text : statementText)

		if (parsed.kind === 'insert' && parsed.format) {
			parsed.data = [data ?? parsed.data ?? '', options.data ?? ''].filter(Boolean).join('\n')
		}

		return this.run(parsed, ctx, database, settings)
	}

	private context(
		settings: Record<string, unknown>,
		params: Record<string, string>,
		database: string,
		text: string
	): QueryContext {
		const fn: FunctionContext = {
			now: Date.now(),
			serverTimeZone: 'UTC',
			settings: new Proxy(settings, {
				get: (target, key: string) => target[key] ?? defaultSetting(key),
			}),
			database,
		}

		const ctx: QueryContext = {
			fn,
			params,
			text,
			subqueries: new Map(),
			inferType,
			run: (query: Query, outer?: Scope) => runQuery(query, { catalog: this.catalog, database }, ctx, outer),
		}

		return ctx
	}

	private run(
		statement: Statement,
		ctx: QueryContext,
		database: string,
		settings: Record<string, unknown>
	): ExecuteResult {
		const done = (writtenRows = 0, result?: QueryResult, format?: string): ExecuteResult => ({
			result,
			format,
			settings,
			writtenRows,
			readRows: result?.rows.length ?? 0,
		})
		const table = (name: string, db = database) => this.catalog.get(db, name, ctx.text)

		switch (statement.kind) {
			case 'query':
				return done(0, runQuery(statement.query, { catalog: this.catalog, database }, ctx), statement.format)

			case 'insert':
				return done(this.insert(table(statement.name, statement.database), statement, ctx, database))

			case 'create-table':
				this.createTable(statement, ctx, database)
				return done()

			case 'create-database':
				if (!this.catalog.databases.has(statement.name)) this.catalog.databases.set(statement.name, new Map())
				else if (!statement.ifNotExists)
					throw new ClickHouseException(
						82,
						'DATABASE_ALREADY_EXISTS',
						`Database ${statement.name} already exists`
					)
				return done()

			case 'drop-database':
				if (statement.name === 'default') throw badArguments("Can't drop the default database")
				if (!this.catalog.databases.delete(statement.name) && !statement.ifExists)
					throw new ClickHouseException(81, 'UNKNOWN_DATABASE', `Database ${statement.name} does not exist`)
				return done()

			case 'drop-table':
				this.catalog.remove(statement.database ?? database, statement.name, statement.ifExists)
				return done()

			case 'truncate': {
				const found = this.catalog.find(statement.database ?? database, statement.name)
				if (!found) {
					if (statement.ifExists) return done()
					table(statement.name, statement.database)
				}
				found!.rows = []
				found!.modifiedAt = Date.now()
				return done()
			}

			case 'rename-table': {
				const found = table(statement.from.name, statement.from.database)
				this.catalog.remove(found.database, found.name, false)
				found.database = statement.to.database ?? database
				found.name = statement.to.name
				this.catalog.add(found, false)
				return done()
			}

			case 'alter': {
				const found = table(statement.name, statement.database)
				for (const action of statement.actions) this.alter(found, action, ctx)
				found.modifiedAt = Date.now()
				return done()
			}

			case 'delete': {
				const found = table(statement.name, statement.database)
				this.deleteRows(found, statement.where, ctx)
				return done()
			}

			case 'optimize': {
				const found = table(statement.name, statement.database)
				this.optimize(found, statement.final, ctx)
				return done()
			}

			case 'exists':
				return done(
					0,
					{
						columns: [{ name: 'result', type: parseType('UInt8') }],
						rows: [[this.catalog.find(statement.database ?? database, statement.name) ? 1 : 0]],
					},
					statement.format
				)

			case 'show-tables':
				return done(
					0,
					{
						columns: [{ name: 'name', type: parseType('String') }],
						rows: [...this.catalog.database(database).keys()].sort().map(name => [name]),
					},
					statement.format
				)

			case 'show-create': {
				const found = table(statement.name, statement.database)
				return done(
					0,
					{ columns: [{ name: 'statement', type: parseType('String') }], rows: [[createTableQuery(found)]] },
					statement.format
				)
			}

			case 'describe': {
				const found = table(statement.name, statement.database)
				return done(
					0,
					{
						columns: [
							'name',
							'type',
							'default_type',
							'default_expression',
							'comment',
							'codec_expression',
							'ttl_expression',
						].map(name => ({ name, type: parseType('String') })),
						rows: found.columns.map(column => [
							column.name,
							formatType(column.type),
							column.defaultKind ?? '',
							column.defaultExpr ? sql(column.defaultExpr) : '',
							column.comment,
							column.codec ?? '',
							'',
						]),
					},
					statement.format
				)
			}

			case 'set':
			case 'use':
				return done()
		}
	}

	// ---------------------------------------------------------------
	// ddl

	private frameOf(table: Table): Frame {
		return {
			columns: table.columns.map(column => ({ name: column.name, qualifiers: [table.name], type: column.type })),
			rows: [],
		}
	}

	private tableScope(table: Table, ctx: QueryContext): Scope {
		const frame = this.frameOf(table)
		const columns = new Map<string, number>()

		frame.columns.forEach((column, index) => {
			columns.set(column.name, index)
			columns.set(`${table.name}.${column.name}`, index)
		})

		return { query: ctx, columns, types: frame.columns.map(column => column.type), row: [], aliases: new Map() }
	}

	private rowValues(table: Table, row: Row) {
		return table.columns.map(column => row[column.name] ?? null)
	}

	private createTable(statement: Extract<Statement, { kind: 'create-table' }>, ctx: QueryContext, database: string) {
		let columns = statement.columns.map(toColumn)
		let rows: Value[][] = []

		if (statement.as) {
			const result = runQuery(statement.as, { catalog: this.catalog, database }, ctx)
			if (columns.length === 0) {
				columns = result.columns.map(column => ({
					name: column.name,
					type: column.type ?? parseType('String'),
					comment: '',
				}))
			}
			rows = result.rows
		}

		const names = new Set<string>()

		for (const column of columns) {
			if (names.has(column.name)) throw duplicateColumn(`Column ${column.name} specified more than once`)
			names.add(column.name)
		}

		const engine = statement.engine

		if (!MERGE_TREE.test(engine.name) && !STORAGE_ENGINES.has(engine.name)) {
			throw notImplemented(`Table engine ${engine.name} is not supported by the in-memory ClickHouse`)
		}

		const orderBy = statement.orderBy ?? statement.primaryKey

		checkTtl(statement.ttl)

		if (MERGE_TREE.test(engine.name) && !orderBy) {
			throw new ClickHouseException(
				42,
				'NUMBER_OF_ARGUMENTS_DOESNT_MATCH',
				`Storage ${engine.name} requires 3 to 4 parameters: ... ORDER BY or PRIMARY KEY clause is missing. Consider using extended storage definition syntax with ORDER BY or PRIMARY KEY clause. With deprecated old syntax (highly not recommended) storage MergeTree requires 3 to 4 parameters`
			)
		}

		const table: Table = {
			database: statement.database ?? database,
			name: statement.name,
			columns,
			indexes: statement.indexes,
			engine,
			partitionBy: statement.partitionBy,
			primaryKey: statement.primaryKey && statement.orderBy ? statement.primaryKey : undefined,
			orderBy: orderBy ?? [],
			ttl: statement.ttl,
			settings: statement.settings,
			comment: statement.comment ?? '',
			rows: [],
			modifiedAt: Date.now(),
		}

		// The keys must evaluate against the columns, like ClickHouse checks.
		const scope = this.tableScope(table, ctx)
		const sample = withRow(
			scope,
			columns.map(column => defaultValue(column.type))
		)

		for (const expr of [
			...table.orderBy,
			...(table.partitionBy ? [table.partitionBy] : []),
			...(table.primaryKey ?? []),
			...(table.ttl ? [table.ttl] : []),
		]) {
			evaluate(expr, sample)
		}

		if (this.catalog.add(table, statement.ifNotExists, statement.orReplace) && rows.length > 0) {
			this.writeRows(
				table,
				rows.map(values =>
					Object.fromEntries(columns.map((column, index) => [column.name, values[index] ?? null]))
				),
				ctx
			)
		}
	}

	private keyColumns(table: Table) {
		const names = new Set<string>()
		const visit = (expr: Expr) => {
			if (expr.kind === 'identifier') names.add(expr.parts.join('.'))
			if (expr.kind === 'function') expr.args.forEach(visit)
		}

		for (const expr of [
			...table.orderBy,
			...(table.primaryKey ?? []),
			...(table.partitionBy ? [table.partitionBy] : []),
		])
			visit(expr)

		return names
	}

	private column(table: Table, name: string) {
		const column = table.columns.find(item => item.name === name)

		if (!column) {
			throw noSuchColumn(`There is no column ${name} in table ${table.database}.${table.name}`)
		}

		return column
	}

	private place(table: Table, column: Column, position: { first?: boolean; after?: string }) {
		const without = table.columns.filter(item => item !== column)

		if (position.first) {
			table.columns = [column, ...without]
		} else if (position.after) {
			const index = without.findIndex(item => item.name === position.after)
			if (index === -1)
				throw noSuchColumn(`Wrong column name. Cannot find column ${position.after} to insert after`)
			table.columns = [...without.slice(0, index + 1), column, ...without.slice(index + 1)]
		} else if (!table.columns.includes(column)) {
			table.columns = [...without, column]
		}
	}

	private alter(table: Table, action: AlterAction, ctx: QueryContext) {
		const keys = this.keyColumns(table)

		switch (action.kind) {
			case 'add-column': {
				if (table.columns.some(column => column.name === action.column.name)) {
					if (action.ifNotExists) return
					throw duplicateColumn(
						`Cannot add column ${action.column.name}: column with this name already exists`
					)
				}

				const column = toColumn(action.column)
				this.place(table, column, action)

				const scope = this.tableScope(table, ctx)

				for (const row of table.rows) {
					row[column.name] = this.defaultFor(column, withRow(scope, this.rowValues(table, row)))
				}

				return
			}
			case 'drop-column': {
				if (!table.columns.some(column => column.name === action.name)) {
					if (action.ifExists) return
					throw noSuchColumn(`Wrong column name. Cannot find column ${action.name} to drop`)
				}

				if (keys.has(action.name)) {
					throw alterForbidden(
						`Trying to ALTER DROP key ${action.name} column which is a part of key expression`
					)
				}

				table.columns = table.columns.filter(column => column.name !== action.name)
				for (const row of table.rows) delete row[action.name]
				return
			}
			case 'modify-column': {
				const existing = table.columns.find(column => column.name === action.column.name)

				if (!existing) {
					if (action.ifExists) return
					throw noSuchColumn(`Wrong column name. Cannot find column ${action.column.name} to modify`)
				}

				if (action.remove) {
					if (
						action.remove === 'DEFAULT' ||
						action.remove === 'MATERIALIZED' ||
						action.remove === 'ALIAS' ||
						action.remove === 'EPHEMERAL'
					) {
						existing.defaultKind = undefined
						existing.defaultExpr = undefined
					} else if (action.remove === 'CODEC') existing.codec = undefined
					else if (action.remove === 'COMMENT') existing.comment = ''
					return
				}

				const def: ColumnDef = action.column

				if (def.type) {
					const type = parseType(def.type)

					if (keys.has(existing.name) && formatType(type) !== formatType(existing.type)) {
						throw alterForbidden(`ALTER of key column ${existing.name} is forbidden`)
					}

					for (const row of table.rows) {
						row[existing.name] = castValue(row[existing.name] ?? null, type)
					}

					existing.type = type
				}

				if (def.defaultKind) {
					existing.defaultKind = def.defaultKind
					existing.defaultExpr = def.defaultExpr
				}

				if (def.codec !== undefined) existing.codec = def.codec
				if (def.comment !== undefined) existing.comment = def.comment

				if (action.first || action.after) this.place(table, existing, action)

				return
			}
			case 'rename-column': {
				const existing = table.columns.find(column => column.name === action.from)

				if (!existing) {
					if (action.ifExists) return
					throw noSuchColumn(`Wrong column name. Cannot find column ${action.from} to rename`)
				}

				if (keys.has(action.from))
					throw alterForbidden(
						`Trying to ALTER RENAME key ${action.from} column which is a part of key expression`
					)

				existing.name = action.to

				for (const row of table.rows) {
					row[action.to] = row[action.from] ?? null
					delete row[action.from]
				}

				return
			}
			case 'comment-column': {
				const existing = table.columns.find(column => column.name === action.name)
				if (!existing) {
					if (action.ifExists) return
					throw noSuchColumn(`Wrong column name. Cannot find column ${action.name} to comment`)
				}
				existing.comment = action.comment
				return
			}
			case 'add-index':
				if (table.indexes.some(index => index.name === action.index.name)) {
					if (action.ifNotExists) return
					throw new ClickHouseException(
						44,
						'ILLEGAL_COLUMN',
						`Cannot add index ${action.index.name}: index with this name already exists`
					)
				}
				table.indexes = [...table.indexes, action.index]
				return
			case 'drop-index':
				if (!table.indexes.some(index => index.name === action.name)) {
					if (action.ifExists) return
					throw badArguments(`Wrong index name. Cannot find index \`${action.name}\` to drop`)
				}
				table.indexes = table.indexes.filter(index => index.name !== action.name)
				return
			case 'materialize-index':
			case 'clear-index':
				if (!table.indexes.some(index => index.name === action.name))
					throw badArguments(`Unknown index: ${action.name}`)
				return
			case 'materialize-column':
				this.column(table, action.name)
				return
			case 'materialize-ttl':
				return
			case 'modify-ttl':
				checkTtl(action.ttl)
				table.ttl = action.ttl
				return
			case 'remove-ttl':
				table.ttl = undefined
				return
			case 'modify-setting':
				for (const [key, value] of action.settings) {
					table.settings = [...table.settings.filter(([name]) => name !== key), [key, value]]
				}
				return
			case 'reset-setting':
				table.settings = table.settings.filter(([name]) => !action.names.includes(name))
				return
			case 'modify-comment':
				table.comment = action.comment
				return
			case 'modify-order-by':
				table.orderBy = action.exprs
				return
			case 'delete':
				this.deleteRows(table, action.where, ctx)
				this.mutation(table, `DELETE WHERE ${sql(action.where)}`)
				return
			case 'update': {
				const scope = this.tableScope(table, ctx)

				for (const [name] of action.assignments) {
					this.column(table, name)
					if (keys.has(name))
						throw new ClickHouseException(
							420,
							'CANNOT_UPDATE_COLUMN',
							`Cannot UPDATE key column \`${name}\``
						)
				}

				for (const row of table.rows) {
					const current = withRow(scope, this.rowValues(table, row))

					if (!evaluateBoolean(action.where, current)) continue

					const updates = action.assignments.map(
						([name, expr]) =>
							[name, castValue(evaluate(expr, current), this.column(table, name).type)] as const
					)
					for (const [name, value] of updates) row[name] = value
				}

				this.mutation(
					table,
					`UPDATE ${action.assignments.map(([name, expr]) => `${quoteIdentifier(name)} = ${sql(expr)}`).join(', ')} WHERE ${sql(action.where)}`
				)
				return
			}
		}
	}

	private mutation(table: Table, command: string) {
		this.catalog.mutations.push({
			database: table.database,
			table: table.name,
			id: `mutation_${++this.mutationCount}.txt`,
			command,
			createdAt: Date.now(),
		})
	}

	private deleteRows(table: Table, where: Expr, ctx: QueryContext) {
		const scope = this.tableScope(table, ctx)
		table.rows = table.rows.filter(row => !evaluateBoolean(where, withRow(scope, this.rowValues(table, row))))
		table.modifiedAt = Date.now()
	}

	private optimize(table: Table, final: boolean, ctx: QueryContext) {
		if (final && (table.engine.name === 'ReplacingMergeTree' || table.engine.name === 'SummingMergeTree')) {
			const result = runQuery(
				{
					kind: 'union',
					distinct: [],
					selects: [
						{
							kind: 'select',
							with: [],
							distinct: false,
							columns: [{ kind: 'asterisk' }],
							from: { kind: 'table', database: table.database, name: table.name, final: true },
							joins: [],
							groupBy: [],
							withTotals: false,
							orderBy: [],
							settings: {},
						},
					],
				},
				{ catalog: this.catalog, database: table.database },
				ctx
			)

			const visible = table.columns.filter(
				column =>
					column.defaultKind !== 'ALIAS' &&
					column.defaultKind !== 'MATERIALIZED' &&
					column.defaultKind !== 'EPHEMERAL'
			)
			const hidden = table.columns.filter(column => column.defaultKind === 'MATERIALIZED')
			const byKey = new Map(
				table.rows.map(row => [JSON.stringify(visible.map(column => valueKey(row[column.name] ?? null))), row])
			)

			table.rows = result.rows.map(values => {
				const row = Object.fromEntries(visible.map((column, index) => [column.name, values[index] ?? null]))
				const original = byKey.get(JSON.stringify(visible.map(column => valueKey(row[column.name] ?? null))))
				for (const column of hidden) row[column.name] = original?.[column.name] ?? null
				return row
			})
		}

		// Expired rows go once the table is merged.
		if (table.ttl) {
			const scope = this.tableScope(table, ctx)
			const now = ctx.fn.now

			table.rows = table.rows.filter(row => {
				const expiry = evaluate(table.ttl!, withRow(scope, this.rowValues(table, row)))
				if (expiry instanceof DateTimeValue) return expiry.ms > now
				if (expiry instanceof DateValue) return expiry.days * 86_400_000 > now
				return true
			})
		}
	}

	// ---------------------------------------------------------------
	// inserts

	private defaultFor(column: Column, scope: Scope): Value {
		if ((column.defaultKind === 'DEFAULT' || column.defaultKind === 'MATERIALIZED') && column.defaultExpr) {
			return castValue(evaluate(column.defaultExpr, scope), column.type)
		}

		return defaultValue(column.type)
	}

	private insert(
		table: Table,
		statement: Extract<Statement, { kind: 'insert' }>,
		ctx: QueryContext,
		database: string
	) {
		const insertable = table.columns.filter(
			column => column.defaultKind !== 'MATERIALIZED' && column.defaultKind !== 'ALIAS'
		)
		const names =
			statement.columns ??
			insertable.filter(column => column.defaultKind !== 'EPHEMERAL').map(column => column.name)

		for (const name of names) {
			const column = this.column(table, name)

			if (column.defaultKind === 'MATERIALIZED' || column.defaultKind === 'ALIAS') {
				throw new ClickHouseException(
					16,
					'NO_SUCH_COLUMN_IN_TABLE',
					`Cannot insert column ${name}, because it is MATERIALIZED or ALIAS column`
				)
			}
		}

		let input: InputRow[]

		if (statement.values) {
			const scope = this.tableScope(table, ctx)
			input = statement.values.map(row => {
				if (row.length !== names.length)
					throw new ClickHouseException(
						27,
						'CANNOT_PARSE_INPUT_ASSERTION_FAILED',
						`Cannot parse expression of type ... here: expected ${names.length} values, got ${row.length}`
					)
				return {
					kind: 'value',
					values: Object.fromEntries(names.map((name, index) => [name, evaluate(row[index]!, scope)])),
				}
			})
		} else if (statement.select) {
			const result = runQuery(statement.select, { catalog: this.catalog, database }, ctx)
			input = result.rows.map(values => ({
				kind: 'value',
				values: Object.fromEntries(names.map((name, index) => [name, values[index] ?? null])),
			}))
		} else {
			input = parseInput(statement.data ?? '', statement.format ?? 'Values', names)
		}

		const skipUnknown =
			ctx.fn.settings.input_format_skip_unknown_fields !== false &&
			ctx.fn.settings.input_format_skip_unknown_fields !== 0 &&
			ctx.fn.settings.input_format_skip_unknown_fields !== '0'
		const known = new Set(table.columns.map(column => column.name))

		const rows = input.map(item => {
			if (!skipUnknown) {
				for (const key of Object.keys(item.values)) {
					if (!known.has(key))
						throw new ClickHouseException(
							117,
							'INCORRECT_DATA',
							`Unknown field found while parsing JSONEachRow format: ${key}`
						)
				}
			}

			const row: Row = {}

			for (const column of insertable) {
				if (!(column.name in item.values)) continue

				const raw = item.values[column.name]

				if (item.kind === 'json') row[column.name] = fromJson(raw, column.type)
				else if (item.kind === 'text')
					row[column.name] =
						raw === null
							? isNullable(column.type)
								? null
								: defaultValue(column.type)
							: unwrap(column.type).name === 'String'
								? (raw as string)
								: castValue(raw as string, column.type)
				else row[column.name] = castValue((raw ?? null) as Value, column.type, false)
			}

			return row
		})

		return this.writeRows(table, rows, ctx, true)
	}

	// Fills in defaults & materialized columns, then appends the rows as one
	// part, sorted by the table's key like ClickHouse sorts an insert.
	private writeRows(table: Table, rows: Row[], ctx: QueryContext, fill = true) {
		if (table.engine.name === 'Null') {
			return rows.length
		}

		const scope = this.tableScope(table, ctx)
		const computed = table.columns.filter(column => column.defaultKind === 'MATERIALIZED')

		for (const row of rows) {
			if (!fill) continue

			for (const column of table.columns) {
				if (column.defaultKind === 'ALIAS' || column.defaultKind === 'MATERIALIZED' || column.name in row)
					continue

				// A type's own default needs no row to evaluate against.
				row[column.name] = column.defaultExpr
					? this.defaultFor(column, withRow(scope, this.rowValues(table, row)))
					: defaultValue(column.type)
			}

			for (const column of computed) {
				row[column.name] = this.defaultFor(column, withRow(scope, this.rowValues(table, row)))
			}

			for (const column of table.columns) {
				if (column.defaultKind === 'EPHEMERAL' || column.defaultKind === 'ALIAS') delete row[column.name]
			}
		}

		if (table.orderBy.length > 0) {
			// A key of plain columns reads them straight from the row.
			const plain = table.orderBy.every(expr => expr.kind === 'identifier' && expr.parts.length === 1)
			const keyOf = plain
				? (row: Row) => table.orderBy.map(expr => row[(expr as { parts: string[] }).parts[0]!] ?? null)
				: (row: Row) => table.orderBy.map(expr => evaluate(expr, withRow(scope, this.rowValues(table, row))))
			const keyed = rows.map((row, index) => ({ row, index, key: keyOf(row) }))

			keyed.sort((a, b) => {
				for (let i = 0; i < a.key.length; i++) {
					const result = compareValues(a.key[i]!, b.key[i]!)
					if (result !== 0) return result
				}
				return a.index - b.index
			})

			rows = keyed.map(entry => entry.row)
		}

		// One by one: spreading a million rows into push overflows the stack.
		for (const row of rows) table.rows.push(row)
		table.modifiedAt = Date.now()

		return rows.length
	}
}

export type { DataType, FrameColumn }
export { columnName }
