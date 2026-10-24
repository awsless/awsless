import {
	ClickHouseClient,
	columnOf,
	Column,
	ColumnDefinition,
	createTableStatement,
	dropTableByName,
	formatColumn,
	formatIndex,
	formatSetting,
	IndexDefinition,
	quoteIdentifier,
	quoteString,
	TableDefinition,
} from '@awsless/clickhouse'

type Normalized = {
	columns: Record<string, Column>
	engine: string
	orderBy: string[]
	partitionBy?: string
	primaryKey?: string[]
	ttl?: string
	indexes: Record<string, IndexDefinition>
	settings: Record<string, string | number | boolean>
}

// The parts that fix how the data is laid out on disk.
const STRUCTURE = ['engine', 'orderBy', 'partitionBy', 'primaryKey'] as const

// The declared definition rides along in the table comment, so a deploy
// diffs against what was declared last instead of what the server
// reports back in its own spelling.
const COMMENT_PREFIX = 'awsless:'

export class TableChangeError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'TableChangeError'
	}
}

export const normalizeTable = (table: TableDefinition): Normalized => {
	return {
		columns: Object.fromEntries(Object.entries(table.columns).map(([name, column]) => [name, columnOf(column)])),
		engine: table.engine ?? 'MergeTree',
		orderBy: table.orderBy ?? [],
		...(table.partitionBy ? { partitionBy: table.partitionBy } : {}),
		...(table.primaryKey ? { primaryKey: table.primaryKey } : {}),
		...(table.ttl ? { ttl: table.ttl } : {}),
		indexes: table.indexes ?? {},
		settings: table.settings ?? {},
	}
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

// ClickHouse writes a layout back in its own spelling, so the parts that
// fix it compare by meaning: the engine by name, a key as its text.
const keyText = (key: string[] | string | undefined) =>
	(Array.isArray(key) ? key.join(', ') : (key ?? '')).replace(/\s+/g, '')

const structureOf = (table: Normalized) => ({
	engine: table.engine.replace(/\(.*$/s, '').trim(),
	orderBy: keyText(table.orderBy),
	partitionBy: keyText(table.partitionBy),
	primaryKey: keyText(table.primaryKey ?? table.orderBy),
})

const commentOf = (table: Normalized) => COMMENT_PREFIX + JSON.stringify(table)

const parseComment = (comment: string): Normalized | undefined => {
	if (!comment.startsWith(COMMENT_PREFIX)) {
		return
	}

	try {
		return JSON.parse(comment.slice(COMMENT_PREFIX.length))
	} catch {
		return
	}
}

export const declaredTableStatement = (name: string, definition: TableDefinition) => {
	return createTableStatement(name, { ...definition, comment: commentOf(normalizeTable(definition)) })
}

// The ALTER statements that bring a table from one declared definition
// to the next. A different engine or key would rewrite every row, so
// that's refused instead of silently dropping the data.
export const alterTableStatements = (name: string, prior: TableDefinition, next: TableDefinition) => {
	const from = normalizeTable(prior)
	const to = normalizeTable(next)
	const table = quoteIdentifier(name)
	const statements: string[] = []

	const fromStructure = structureOf(from)
	const toStructure = structureOf(to)

	for (const key of STRUCTURE) {
		if (fromStructure[key] !== toStructure[key]) {
			throw new TableChangeError(
				`The ${key} of ClickHouse table "${name}" can't change in place. Declare a new table & copy the data over instead.`
			)
		}
	}

	const names = Object.keys(to.columns)
	// The columns that stay, in the order they have now.
	const fromOrder = Object.keys(from.columns).filter(column => to.columns[column])

	names.forEach((column, index) => {
		const before = from.columns[column]
		const after = to.columns[column]!

		if (!before) {
			const position = index === 0 ? 'FIRST' : `AFTER ${quoteIdentifier(names[index - 1]!)}`
			statements.push(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${formatColumn(column, after)} ${position}`)
			return
		}

		// A column moves when the column before it, among the ones that stay,
		// isn't the one it has now.
		const expectedBefore = names.slice(0, index).findLast(other => from.columns[other])
		const actualBefore = fromOrder[fromOrder.indexOf(column) - 1]
		const moved = expectedBefore !== actualBefore
		const position = moved ? (expectedBefore ? ` AFTER ${quoteIdentifier(expectedBefore)}` : ' FIRST') : ''

		if (same(before, after) && !moved) {
			return
		}

		for (const part of ['default', 'materialized', 'codec'] as const) {
			if (before[part] && !after[part]) {
				statements.push(
					`ALTER TABLE ${table} MODIFY COLUMN ${quoteIdentifier(column)} REMOVE ${part.toUpperCase()}`
				)
			}
		}

		if (before.comment && !after.comment) {
			statements.push(`ALTER TABLE ${table} COMMENT COLUMN ${quoteIdentifier(column)} ''`)
		}

		statements.push(`ALTER TABLE ${table} MODIFY COLUMN ${formatColumn(column, after)}${position}`)
	})

	for (const column of Object.keys(from.columns)) {
		if (!to.columns[column]) {
			statements.push(`ALTER TABLE ${table} DROP COLUMN IF EXISTS ${quoteIdentifier(column)}`)
		}
	}

	for (const [index, props] of Object.entries(from.indexes)) {
		if (!same(props, to.indexes[index])) {
			statements.push(`ALTER TABLE ${table} DROP INDEX IF EXISTS ${quoteIdentifier(index)}`)
		}
	}

	for (const [index, props] of Object.entries(to.indexes)) {
		if (!same(props, from.indexes[index])) {
			statements.push(
				`ALTER TABLE ${table} ADD ${formatIndex(index, props).replace('INDEX', 'INDEX IF NOT EXISTS')}`
			)
			// Builds the index for the rows already stored, in the background.
			statements.push(`ALTER TABLE ${table} MATERIALIZE INDEX ${quoteIdentifier(index)}`)
		}
	}

	if (from.ttl !== to.ttl) {
		statements.push(to.ttl ? `ALTER TABLE ${table} MODIFY TTL ${to.ttl}` : `ALTER TABLE ${table} REMOVE TTL`)
	}

	const changed = Object.entries(to.settings).filter(([key, value]) => from.settings[key] !== value)
	const removed = Object.keys(from.settings).filter(key => !(key in to.settings))

	if (changed.length > 0) {
		statements.push(
			`ALTER TABLE ${table} MODIFY SETTING ${changed.map(([key, value]) => `${key} = ${formatSetting(value)}`).join(', ')}`
		)
	}

	if (removed.length > 0) {
		statements.push(`ALTER TABLE ${table} RESET SETTING ${removed.join(', ')}`)
	}

	if (!same(from, to)) {
		statements.push(`ALTER TABLE ${table} MODIFY COMMENT ${quoteString(commentOf(to))}`)
	}

	return statements
}

type LiveColumn = {
	name: string
	type: string
	default_kind: string
	default_expression: string
	compression_codec: string
	comment: string
}

type LiveTable = {
	engine: string
	sorting_key: string
	partition_key: string
	primary_key: string
	comment: string
}

// The table as ClickHouse has it right now.
const describeTable = async (client: ClickHouseClient, name: string) => {
	const [table] = await client.query<LiveTable>(
		'SELECT engine, sorting_key, partition_key, primary_key, comment FROM system.tables WHERE database = currentDatabase() AND name = {name:String}',
		{ name }
	)

	if (!table) {
		return
	}

	const columns = await client.query<LiveColumn>(
		'SELECT name, type, default_kind, default_expression, compression_codec, comment FROM system.columns WHERE database = currentDatabase() AND table = {name:String} ORDER BY position',
		{ name }
	)

	return { ...table, columns }
}

const liveColumn = (column: LiveColumn): Column => ({
	type: column.type,
	...(column.default_kind === 'DEFAULT' ? { default: column.default_expression } : {}),
	...(column.default_kind === 'MATERIALIZED' ? { materialized: column.default_expression } : {}),
	...(column.compression_codec ? { codec: column.compression_codec.replace(/^CODEC\((.*)\)$/s, '$1') } : {}),
	...(column.comment ? { comment: column.comment } : {}),
})

const sameType = (a: string, b: string) => a.replace(/\s+/g, '') === b.replace(/\s+/g, '')

// What a deploy diffs against: the definition declared last, in its own
// spelling, with the live layout & columns correcting it - so a table
// made outside awsless, or an ALTER that failed halfway, is seen as it is
// instead of as it was meant to be.
const priorDefinition = (live: NonNullable<Awaited<ReturnType<typeof describeTable>>>): TableDefinition => {
	const declared = parseComment(live.comment)
	const columns: Record<string, ColumnDefinition> = {}

	for (const column of live.columns) {
		const known = declared?.columns[column.name]
		columns[column.name] = known && sameType(known.type, column.type) ? known : liveColumn(column)
	}

	return {
		columns,
		engine: live.engine,
		orderBy: live.sorting_key ? live.sorting_key.split(',').map(part => part.trim()) : [],
		partitionBy: live.partition_key || undefined,
		primaryKey: live.primary_key ? live.primary_key.split(',').map(part => part.trim()) : undefined,
		ttl: declared?.ttl,
		indexes: declared?.indexes ?? {},
		settings: declared?.settings ?? {},
	}
}

export type ApplyTableOptions = {
	// Drop & create the table when its engine or keys change, for local
	// environments where the data can go.
	recreate?: boolean
}

// Creates a missing table, or alters an existing one to the definition.
export const applyTable = async (
	client: ClickHouseClient,
	name: string,
	definition: TableDefinition,
	options: ApplyTableOptions = {}
) => {
	const live = await describeTable(client, name)

	if (!live) {
		await client.command(declaredTableStatement(name, definition))
		return
	}

	const prior = priorDefinition(live)
	let statements: string[]

	try {
		statements = alterTableStatements(name, prior, definition)
	} catch (error) {
		if (options.recreate && error instanceof TableChangeError) {
			await dropTableByName(client, name)
			await client.command(declaredTableStatement(name, definition))
			return
		}

		throw error
	}

	for (const statement of statements) {
		await client.command(statement)
	}
}
