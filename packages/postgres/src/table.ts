import { assertIdentifier } from './transport'

export type ColumnDefinition =
	| string
	| {
			// A Postgres type as written, like "uuid" or "double precision".
			// A "?" at its end lets the column be NULL.
			type: string
			// An expression that fills the column when an insert leaves it out.
			default?: string
			// The collation of a text column, like "C" to sort by bytes.
			collate?: string
			// Postgres numbers the rows itself: GENERATED ALWAYS AS IDENTITY.
			identity?: boolean
	  }

export type IndexDefinition =
	| string[]
	| {
			columns: string[]
			unique?: boolean
	  }

export type TableDefinition = {
	columns: Record<string, ColumnDefinition>
	primaryKey: string[]
	// Named per table: the index in Postgres is called <table>_<name>.
	indexes?: Record<string, IndexDefinition>
	// Rows spread over this many partitions by the hash of the columns.
	partitionBy?: { hash: string[]; partitions: number }
	// The share of every page an insert fills, leaving the rest for updates.
	fillfactor?: number
}

type Column = {
	type: string
	nullable: boolean
	default?: string
	collate?: string
	identity: boolean
}

type Index = {
	columns: string[]
	unique: boolean
}

// A definition with every shorthand written out, the way it is stored
// with the table & compared.
export type DeclaredTable = {
	columns: Record<string, Column>
	primaryKey: string[]
	indexes: Record<string, Index>
	partitionBy?: { hash: string[]; partitions: number }
	fillfactor?: number
}

// The declared definition rides along in the table comment, so an apply
// diffs against what was declared last instead of what Postgres reports
// back in its own spelling.
const COMMENT_PREFIX = 'awsless:'

export class TableChangeError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'TableChangeError'
	}
}

const columnOf = (definition: ColumnDefinition): Column => {
	const column = typeof definition === 'string' ? { type: definition } : definition
	const type = column.type.trim()
	const nullable = type.endsWith('?')

	return {
		type: nullable ? type.slice(0, -1).trim() : type,
		nullable,
		...(column.default !== undefined ? { default: column.default } : {}),
		...(column.collate ? { collate: column.collate } : {}),
		identity: column.identity ?? false,
	}
}

export const declareTable = (table: TableDefinition): DeclaredTable => {
	return {
		columns: Object.fromEntries(Object.entries(table.columns).map(([name, column]) => [name, columnOf(column)])),
		primaryKey: table.primaryKey,
		indexes: Object.fromEntries(
			Object.entries(table.indexes ?? {}).map(([name, index]) => [
				name,
				Array.isArray(index)
					? { columns: index, unique: false }
					: { columns: index.columns, unique: index.unique ?? false },
			])
		),
		...(table.partitionBy
			? { partitionBy: { hash: table.partitionBy.hash, partitions: table.partitionBy.partitions } }
			: {}),
		...(table.fillfactor !== undefined ? { fillfactor: table.fillfactor } : {}),
	}
}

const isSame = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

// "Double  Precision" & "double precision" are one type.
const typeText = (type: string) => type.replace(/\s+/g, ' ').toLowerCase()

// Every name is checked, so it can stand in sql as written. The quotes
// only keep a name like "order" from reading as a keyword.
const quote = (name: string) => `"${assertIdentifier(name)}"`

const quoteString = (value: string) => `'${value.replaceAll("'", "''")}'`

const columnList = (columns: string[]) => columns.map(quote).join(', ')

const indexName = (table: string, index: string) => `${table}_${index}`

const partitionName = (table: string, partition: number) => `${table}_p${partition}`

const formatColumn = (name: string, column: Column) => {
	return [
		quote(name),
		column.type,
		// A collation is named with its capitals, like "C".
		column.collate ? `COLLATE "${column.collate.replaceAll('"', '""')}"` : '',
		column.identity ? 'GENERATED ALWAYS AS IDENTITY' : '',
		column.default !== undefined ? `DEFAULT ${column.default}` : '',
		column.nullable ? '' : 'NOT NULL',
	]
		.filter(Boolean)
		.join(' ')
}

const createIndexStatement = (table: string, name: string, index: Index) => {
	const kind = index.unique ? 'UNIQUE INDEX' : 'INDEX'

	return `CREATE ${kind} ${quote(indexName(table, name))} ON ${quote(table)} (${columnList(index.columns)})`
}

// A partitioned table has no pages of its own, so its partitions take
// the fillfactor.
const storageTables = (name: string, table: DeclaredTable) => {
	return table.partitionBy
		? Array.from({ length: table.partitionBy.partitions }, (_, partition) => partitionName(name, partition))
		: [name]
}

const commentStatement = (name: string, table: DeclaredTable) => {
	return `COMMENT ON TABLE ${quote(name)} IS ${quoteString(COMMENT_PREFIX + JSON.stringify(table))}`
}

// The declared definition a table's comment holds, when awsless made it.
export const parseTableComment = (comment: string | null | undefined): DeclaredTable | undefined => {
	if (!comment?.startsWith(COMMENT_PREFIX)) {
		return
	}

	try {
		return JSON.parse(comment.slice(COMMENT_PREFIX.length))
	} catch {
		return
	}
}

export const createTableStatements = (name: string, table: DeclaredTable) => {
	const fillfactor = table.fillfactor !== undefined ? ` WITH (fillfactor = ${table.fillfactor})` : ''
	const lines = [
		...Object.entries(table.columns).map(([column, props]) => formatColumn(column, props)),
		`PRIMARY KEY (${columnList(table.primaryKey)})`,
	]

	const statements = [
		[
			`CREATE TABLE ${quote(name)} (\n\t${lines.join(',\n\t')}\n)`,
			table.partitionBy ? ` PARTITION BY HASH (${columnList(table.partitionBy.hash)})` : fillfactor,
		].join(''),
	]

	if (table.partitionBy) {
		const { partitions } = table.partitionBy

		for (let partition = 0; partition < partitions; partition++) {
			statements.push(
				`CREATE TABLE ${quote(partitionName(name, partition))} PARTITION OF ${quote(name)} FOR VALUES WITH (MODULUS ${partitions}, REMAINDER ${partition})${fillfactor}`
			)
		}
	}

	for (const [index, props] of Object.entries(table.indexes)) {
		statements.push(createIndexStatement(name, index, props))
	}

	statements.push(commentStatement(name, table))

	return statements
}

const refuseChange = (name: string, what: string, detail = ''): never => {
	throw new TableChangeError(
		`The ${what}${detail} of Postgres table "${name}" can't change in place. Declare a new table & copy the data over instead.`
	)
}

// The statements that bring a table from the definition it was made with
// to the next one. A new key, column type or partitioning would rewrite
// every row, so that's refused instead of done behind the app's back.
export const alterDeclaredTable = (name: string, from: DeclaredTable, to: DeclaredTable) => {
	const table = quote(name)
	const statements: string[] = []

	if (!isSame(from.partitionBy, to.partitionBy)) {
		refuseChange(name, 'partitioning')
	}

	if (!isSame(from.primaryKey, to.primaryKey)) {
		refuseChange(name, 'primary key')
	}

	for (const [column, after] of Object.entries(to.columns)) {
		const before = from.columns[column]

		if (!before) {
			continue
		}

		if (typeText(before.type) !== typeText(after.type)) {
			refuseChange(name, `type of column "${column}"`, ` (${before.type} to ${after.type})`)
		}

		if (before.collate !== after.collate) {
			refuseChange(name, `collation of column "${column}"`)
		}

		if (before.identity !== after.identity) {
			refuseChange(name, `identity of column "${column}"`)
		}
	}

	// Indexes go first: Postgres drops one with a column it holds anyway.
	for (const [index, props] of Object.entries(from.indexes)) {
		if (!isSame(props, to.indexes[index])) {
			statements.push(`DROP INDEX IF EXISTS ${quote(indexName(name, index))}`)
		}
	}

	for (const column of Object.keys(from.columns)) {
		if (!to.columns[column]) {
			statements.push(`ALTER TABLE ${table} DROP COLUMN ${quote(column)}`)
		}
	}

	for (const [column, after] of Object.entries(to.columns)) {
		const before = from.columns[column]

		if (!before) {
			statements.push(`ALTER TABLE ${table} ADD COLUMN ${formatColumn(column, after)}`)
			continue
		}

		if (before.default !== after.default) {
			statements.push(
				after.default !== undefined
					? `ALTER TABLE ${table} ALTER COLUMN ${quote(column)} SET DEFAULT ${after.default}`
					: `ALTER TABLE ${table} ALTER COLUMN ${quote(column)} DROP DEFAULT`
			)
		}

		if (before.nullable !== after.nullable) {
			statements.push(
				`ALTER TABLE ${table} ALTER COLUMN ${quote(column)} ${after.nullable ? 'DROP' : 'SET'} NOT NULL`
			)
		}
	}

	for (const [index, props] of Object.entries(to.indexes)) {
		if (!isSame(props, from.indexes[index])) {
			statements.push(createIndexStatement(name, index, props))
		}
	}

	if (from.fillfactor !== to.fillfactor) {
		for (const storage of storageTables(name, to)) {
			statements.push(
				to.fillfactor !== undefined
					? `ALTER TABLE ${quote(storage)} SET (fillfactor = ${to.fillfactor})`
					: `ALTER TABLE ${quote(storage)} RESET (fillfactor)`
			)
		}
	}

	if (!isSame(from, to)) {
		statements.push(commentStatement(name, to))
	}

	return statements
}

// What a change of a table's declaration does to it: the statements to
// run, or a TableChangeError for a change that can't happen in place.
// Reads nothing, so a deploy can refuse a change before anything runs.
export const alterTableStatements = (name: string, prior: TableDefinition, next: TableDefinition) => {
	return alterDeclaredTable(name, declareTable(prior), declareTable(next))
}
