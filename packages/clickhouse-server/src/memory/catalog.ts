import { ColumnDef, Expr, IndexDef } from './ast'
import { tableExists, unknownDatabase, unknownTable } from './errors'
import { quoteIdentifier, sql } from './naming'
import { DataType, formatType, parseType } from './types'
import { Value } from './values'

export type Column = {
	name: string
	type: DataType
	defaultKind?: 'DEFAULT' | 'MATERIALIZED' | 'ALIAS' | 'EPHEMERAL'
	defaultExpr?: Expr
	codec?: string
	comment: string
}

export type Row = Record<string, Value>

export type Table = {
	database: string
	name: string
	columns: Column[]
	indexes: IndexDef[]
	engine: { name: string; args: Expr[] }
	partitionBy?: Expr
	primaryKey?: Expr[]
	orderBy: Expr[]
	ttl?: Expr
	settings: [string, unknown][]
	comment: string
	rows: Row[]
	modifiedAt: number
}

export type Mutation = {
	database: string
	table: string
	id: string
	command: string
	createdAt: number
}

const MERGE_TREE = /MergeTree$/

export const toColumn = (def: ColumnDef): Column => {
	if (!def.type && !def.defaultExpr) {
		throw unknownTable(`Column ${def.name} needs a type or a default expression`)
	}

	return {
		name: def.name,
		type: parseType(def.type ?? 'String'),
		defaultKind: def.defaultKind,
		defaultExpr: def.defaultExpr,
		codec: def.codec,
		comment: def.comment ?? '',
	}
}

const quoteString = (value: string) => `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`

const formatSettingValue = (value: unknown) =>
	typeof value === 'string' ? quoteString(value) : typeof value === 'boolean' ? (value ? '1' : '0') : String(value)

export const formatColumn = (column: Column) => {
	return [
		`\`${column.name.replaceAll('`', '\\`')}\``,
		formatType(column.type),
		column.defaultKind && column.defaultExpr
			? `${column.defaultKind} ${sql(column.defaultExpr)}`
			: column.defaultKind === 'EPHEMERAL'
				? 'EPHEMERAL'
				: '',
		column.codec ? `CODEC(${column.codec})` : '',
		column.comment ? `COMMENT ${quoteString(column.comment)}` : '',
	]
		.filter(Boolean)
		.join(' ')
}

const keyText = (exprs: Expr[]) => exprs.map(expr => sql(expr)).join(', ')

const orderByText = (exprs: Expr[]) =>
	exprs.length === 0 ? 'tuple()' : exprs.length === 1 ? sql(exprs[0]!) : `(${keyText(exprs)})`

// ClickHouse spells out the settings a MergeTree table gets by default.
export const effectiveSettings = (table: Table): [string, unknown][] => {
	if (!MERGE_TREE.test(table.engine.name) || table.settings.some(([key]) => key === 'index_granularity')) {
		return table.settings
	}

	return [['index_granularity', 8192], ...table.settings]
}

export const engineText = (table: Table) => {
	const args = table.engine.args.length > 0 ? `(${table.engine.args.map(arg => sql(arg)).join(', ')})` : ''
	const settings = effectiveSettings(table)

	return [
		`${table.engine.name}${args}`,
		table.partitionBy ? `PARTITION BY ${sql(table.partitionBy)}` : '',
		table.primaryKey ? `PRIMARY KEY ${orderByText(table.primaryKey)}` : '',
		MERGE_TREE.test(table.engine.name) ? `ORDER BY ${orderByText(table.orderBy)}` : '',
		table.ttl ? `TTL ${sql(table.ttl)}` : '',
		settings.length > 0
			? `SETTINGS ${settings.map(([key, value]) => `${key} = ${formatSettingValue(value)}`).join(', ')}`
			: '',
	]
		.filter(Boolean)
		.join(' ')
}

// The table's definition the way ClickHouse writes it back.
export const createTableQuery = (table: Table) => {
	const items = [
		...table.columns.map(formatColumn),
		...table.indexes.map(
			index =>
				`INDEX ${quoteIdentifier(index.name)} ${sql(index.expr)} TYPE ${index.type} GRANULARITY ${index.granularity}`
		),
	]

	return [
		`CREATE TABLE ${quoteIdentifier(table.database)}.${quoteIdentifier(table.name)} (${items.join(', ')}) ENGINE = ${engineText(table)}`,
		table.comment ? `COMMENT ${quoteString(table.comment)}` : '',
	]
		.filter(Boolean)
		.join(' ')
}

export const sortingKey = (table: Table) => keyText(table.orderBy)
export const primaryKey = (table: Table) => keyText(table.primaryKey ?? table.orderBy)
export const partitionKey = (table: Table) => (table.partitionBy ? sql(table.partitionBy) : '')

export class Catalog {
	readonly databases = new Map<string, Map<string, Table>>([['default', new Map()]])
	readonly mutations: Mutation[] = []

	database(name: string) {
		const database = this.databases.get(name)

		if (!database) {
			throw unknownDatabase(`Database ${name} does not exist`)
		}

		return database
	}

	find(database: string, name: string) {
		return this.databases.get(database)?.get(name)
	}

	get(database: string, name: string, scope: string) {
		const table = this.find(database, name)

		if (!table) {
			if (!this.databases.has(database)) {
				throw unknownDatabase(`Database ${database} does not exist`)
			}

			throw unknownTable(
				`Unknown table expression identifier '${database === 'default' ? name : `${database}.${name}`}' in scope ${scope}`
			)
		}

		return table
	}

	add(table: Table, ifNotExists: boolean, replace = false) {
		const database = this.database(table.database)

		if (database.has(table.name) && !replace) {
			if (ifNotExists) return false
			throw tableExists(`Table ${table.database}.${table.name} already exists`)
		}

		database.set(table.name, table)

		return true
	}

	remove(database: string, name: string, ifExists: boolean) {
		const tables = this.databases.get(database)

		if (!tables?.has(name)) {
			if (ifExists) return
			throw unknownTable(`Table ${database}.${name} does not exist`)
		}

		tables.delete(name)
	}

	tables() {
		return [...this.databases.values()].flatMap(tables => [...tables.values()])
	}

	clear() {
		this.databases.clear()
		this.databases.set('default', new Map())
		this.mutations.length = 0
	}
}

export { formatType }
