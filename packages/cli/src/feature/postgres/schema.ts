import { days, minutes } from '@awsless/duration'
import { z } from 'zod'
import { DurationSchema, durationMax, durationMin, isWholeDays } from '../../config/schema/duration.js'
import { LocalFileSchema } from '../../config/schema/local-file.js'

// Aurora Serverless v2 scales in steps of half an ACU, 1 GiB of memory, up
// to 256 ACU. The config speaks in memory, like the ClickHouse block.
const MemorySchema = z
	.number()
	.refine(value => Number.isInteger(value), 'Memory goes in steps of 1 GiB.')
	.refine(value => value <= 512, 'Memory can not be over 512 GiB.')

// The one Aurora Serverless database of the app, created as soon as any
// stack declares a Postgres schema.
export const PostgresDefaultSchema = z
	.object({
		memory: z
			.object({
				min: MemorySchema.refine(value => value >= 0, 'The minimum memory can not be under 0.')
					.default(1)
					.describe(
						'The least memory the database keeps, in GiB (1 GiB is half an ACU). With 0 it pauses when idle, after its idleTimeout.'
					),
				max: MemorySchema.refine(value => value >= 2, 'The maximum memory can not be under 2 GiB.')
					.default(8)
					.describe('The most memory the database scales to, in GiB, capping the cost.'),
			})
			.strict()
			.refine(memory => memory.min <= memory.max, 'The minimum memory can not exceed the maximum.')
			.prefault({})
			.describe('The memory range the database scales in, as the load changes.'),
		idleTimeout: DurationSchema.refine(durationMin(minutes(5)), 'The idle timeout can not be under 5 minutes.')
			.refine(durationMax(days(1)), 'The idle timeout can not be over a day.')
			.optional()
			.describe(
				'How long the database stays up without a query before it pauses, like "10 minutes". Leave it out & the database never pauses. It goes with a minimum memory of 0. The first query after a pause waits for the database to resume, which takes about 15 seconds.'
			),
		backup: z
			.object({
				retention: DurationSchema.refine(isWholeDays, 'A backup retention must be whole days.')
					.refine(durationMin(days(1)), 'A backup retention can not be under a day.')
					.refine(durationMax(days(35)), 'A backup retention can not be over 35 days.')
					.prefault('35 days')
					.describe(
						'How long the database can be restored to any moment in the past, like "7 days". At most 35 days.'
					),
			})
			.strict()
			.prefault({})
			.describe("The database's own continuous backups."),
		version: z
			.string()
			.regex(/^\d+(\.\d+)?$/, 'A version looks like "17" or "17.5".')
			.optional()
			.describe(
				'The Aurora PostgreSQL version to run, like "17.11", or "17" to follow the minor versions Aurora picks. Leave it out for the default, 17.11. Queries go through the RDS Data API, which needs 17.4 or newer on version 17.'
			),
	})
	.strict()
	.refine(
		props => !props.idleTimeout || props.memory.min === 0,
		'idleTimeout needs a minimum memory of 0: a database that keeps memory never pauses.'
	)
	.refine(
		props => props.memory.min > 0 || props.idleTimeout !== undefined,
		'A minimum memory of 0 pauses the database when idle: say after how long with idleTimeout, like "5 minutes".'
	)
	.prefault({})
	.describe(
		'Configure the Aurora Serverless database that holds the Postgres schema of every stack in your app. It is created with the first stack that declares Postgres tables. Nothing connects to it: every query goes through the RDS Data API. Locally & in tests a Postgres on your machine stands in for it.'
	)

const NAME_MESSAGE =
	'Postgres names are lowercase letters, digits & underscores, starting with a letter, like "links" or "created_at".'

const NameSchema = z
	.string()
	.max(63)
	.regex(/^[a-z_][a-z0-9_]*$/, NAME_MESSAGE)

// Tables, columns & indexes by name, with the rule for a name spelled
// out: zod only says a key is invalid.
const named = <Value extends z.ZodType>(value: Value) => {
	return z.record(NameSchema, value, {
		error: issue => (issue.code === 'invalid_key' ? NAME_MESSAGE : undefined),
	})
}

// The types apps use most, for the editor to suggest. Any Postgres type
// works, written as Postgres writes it. A "?" at the end lets it be NULL.
const TYPES = {
	uuid: 'A UUID.',
	text: 'Text of any length.',
	integer: 'A whole number up to about 2 billion.',
	bigint: 'A whole number of 64 bits.',
	'double precision': 'A number with decimals, as a float.',
	numeric: 'An exact number with decimals.',
	boolean: 'True or false.',
	timestamptz: 'A moment in time.',
	date: 'A calendar day, without a time.',
	jsonb: 'Any JSON value.',
	bytea: 'Bytes.',
}

const suggestions = Object.entries(TYPES).flatMap(([name, description]) => [
	z.literal(name).describe(description),
	z.literal(`${name}?`).describe(`${description} Or nothing (NULL).`),
])

const TypeSchema = z
	.union([...suggestions, z.string().min(1)] as unknown as [z.ZodString, ...z.ZodString[]])
	.describe(
		'The column type: any Postgres type as written, like "uuid", "text", "timestamptz", "double precision" or "datemultirange". The column is NOT NULL, unless the type ends in "?", like "timestamptz?".'
	)

const ColumnSchema = z.union([
	TypeSchema,
	z
		.object({
			type: TypeSchema,
			default: z
				.string()
				.min(1)
				.optional()
				.describe(
					'An SQL expression that fills the column when an insert leaves it out, as written: "now()", "0" or "\'{}\'".'
				),
			collate: z
				.string()
				.regex(/^[A-Za-z0-9_.@-]+$/, 'A collation is named like "C" or "en-US-x-icu".')
				.optional()
				.describe(
					'The collation of a text column, like "C" to sort by bytes, the same on every machine. It can not change later.'
				),
			identity: z
				.boolean()
				.optional()
				.describe('Postgres numbers the rows itself (GENERATED ALWAYS AS IDENTITY). It can not change later.'),
		})
		.strict(),
])

const ColumnsSchema = z.array(NameSchema).min(1)

const IndexSchema = z.union([
	ColumnsSchema.describe('The columns of the index, in order.'),
	z
		.object({
			columns: ColumnsSchema.describe('The columns of the index, in order.'),
			unique: z.boolean().optional().describe('No two rows can hold the same values in these columns.'),
		})
		.strict(),
])

const TableShape = z
	.object({
		columns: named(ColumnSchema)
			.refine(columns => Object.keys(columns).length > 0, 'A table needs at least one column.')
			.describe(
				'The columns, each with its type. A column can be added or dropped later & its default or NULL rule changed; its type can not.'
			),
		primaryKey: ColumnsSchema.describe(
			'The columns that tell one row from every other, like ["project_id", "external_id"]. It can not change after the table exists.'
		),
		indexes: named(IndexSchema)
			.optional()
			.describe(
				'Indexes for the reads the primary key does not cover, by name: its columns in order, or { "columns": [...], "unique": true }. In Postgres an index is called <table>_<name>.'
			),
		partitionBy: z
			.object({
				hash: ColumnsSchema.describe('The columns whose hash picks the partition of a row.'),
				partitions: z.number().int().min(2).max(1024).describe('How many partitions the rows spread over.'),
			})
			.strict()
			.optional()
			.describe(
				'Spreads the rows over partitions by the hash of some columns, like { "hash": ["project_id"], "partitions": 32 }. The primary key & every unique index have to contain these columns. It can not change after the table exists.'
			),
		fillfactor: z
			.number()
			.int()
			.min(10)
			.max(100)
			.optional()
			.describe(
				'The percentage of every page an insert fills, leaving the rest for updates of its rows, like 85. Defaults to 100.'
			),
	})
	.strict()

type Table = z.output<typeof TableShape>

const isNullable = (column: Table['columns'][string]) => {
	return (typeof column === 'string' ? column : column.type).trim().endsWith('?')
}

const TableSchema = TableShape.superRefine((table, ctx) => {
	const names = Object.keys(table.columns)

	// Every list of columns names columns the table has, each once.
	const checkColumns = (columns: string[], path: (string | number)[], what: string) => {
		columns.forEach((column, index) => {
			if (!names.includes(column)) {
				ctx.addIssue({
					code: 'custom',
					path: [...path, index],
					message: `${what} names the column "${column}", which the table doesn't have.`,
				})
			} else if (columns.indexOf(column) !== index) {
				ctx.addIssue({
					code: 'custom',
					path: [...path, index],
					message: `${what} names the column "${column}" twice.`,
				})
			}
		})
	}

	checkColumns(table.primaryKey, ['primaryKey'], 'The primary key')

	for (const name of table.primaryKey) {
		const column = table.columns[name]

		if (column && isNullable(column)) {
			ctx.addIssue({
				code: 'custom',
				path: ['columns', name],
				message: `The column "${name}" is in the primary key, so it can't be NULL: leave the "?" off its type.`,
			})
		}
	}

	for (const [name, column] of Object.entries(table.columns)) {
		if (typeof column === 'string' || !column.identity) {
			continue
		}

		if (column.default !== undefined) {
			ctx.addIssue({
				code: 'custom',
				path: ['columns', name, 'default'],
				message: `The column "${name}" is an identity, which Postgres fills itself: it takes no default.`,
			})
		}

		if (isNullable(column)) {
			ctx.addIssue({
				code: 'custom',
				path: ['columns', name, 'type'],
				message: `The column "${name}" is an identity, which is never NULL: leave the "?" off its type.`,
			})
		}
	}

	const indexes = Object.entries(table.indexes ?? {}).map(([name, index]) => ({
		name,
		columns: Array.isArray(index) ? index : index.columns,
		unique: !Array.isArray(index) && index.unique === true,
		path: Array.isArray(index) ? ['indexes', name] : ['indexes', name, 'columns'],
	}))

	for (const index of indexes) {
		checkColumns(index.columns, index.path, `The index "${index.name}"`)
	}

	if (!table.partitionBy) {
		return
	}

	const partitionColumns = table.partitionBy.hash

	checkColumns(partitionColumns, ['partitionBy', 'hash'], 'The partitioning')

	// Postgres can only keep rows unique inside one partition, so what has
	// to be unique has to decide the partition too.
	const missingFrom = (columns: string[]) => {
		return partitionColumns
			.filter(column => !columns.includes(column))
			.map(column => `"${column}"`)
			.join(', ')
	}

	const missingFromKey = missingFrom(table.primaryKey)

	if (missingFromKey) {
		ctx.addIssue({
			code: 'custom',
			path: ['primaryKey'],
			message: `The primary key of a partitioned table has to contain its partition columns: ${missingFromKey} is missing.`,
		})
	}

	for (const index of indexes) {
		const missing = index.unique ? missingFrom(index.columns) : ''

		if (missing) {
			ctx.addIssue({
				code: 'custom',
				path: index.path,
				message: `The unique index "${index.name}" of a partitioned table has to contain its partition columns: ${missing} is missing.`,
			})
		}
	}
})

// Postgres cuts a name off at 63 characters, so a longer one could end up
// the same as another.
const MAX_NAME = 63

const TablesSchema = named(TableSchema).superRefine((tables, ctx) => {
	for (const [name, table] of Object.entries(tables)) {
		for (const index of Object.keys(table.indexes ?? {})) {
			if (`${name}_${index}`.length > MAX_NAME) {
				ctx.addIssue({
					code: 'custom',
					path: [name, 'indexes', index],
					message: `The index "${index}" is called "${name}_${index}" in Postgres, which is over ${MAX_NAME} characters. Give it a shorter name.`,
				})
			}
		}

		if (table.partitionBy && `${name}_p${table.partitionBy.partitions - 1}`.length > MAX_NAME) {
			ctx.addIssue({
				code: 'custom',
				path: [name],
				message: `The partitions of "${name}" are called "${name}_p0" and up in Postgres, which gets over ${MAX_NAME} characters. Give the table a shorter name.`,
			})
		}
	}
})

export const PostgresSchema = z
	.object({
		tables: TablesSchema.describe(
			'The tables of the schema, by name. They are created & changed in place where that keeps the rows: columns, defaults, NULL rules, indexes & the fillfactor. A new primary key, column type or partitioning is refused, since it would rewrite every row.'
		),
		functions: z
			.array(LocalFileSchema)
			.optional()
			.describe(
				[
					'SQL files with the functions of the schema, relative to the stack file, like ["./src/util/sql/function.sql"]. They run in this order after the tables are there, every time the schema is applied.',
					'Every function in the schema is dropped before the files run, so they create their functions with a plain CREATE FUNCTION.',
					'Install an extension into public, where every schema finds it: CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA public.',
					'On a deploy every statement of a file is sent on its own, so one statement can be 65,536 characters at most.',
				].join('\n')
			),
	})
	.strict()
	.optional()
	.describe(
		[
			'Give your stack a schema of its own in the Postgres database of your app, named after the stack with underscores. Postgres.<stack>.query() runs SQL with that schema as its search path, before public.',
			'Deployed, a query is one call of the RDS Data API: one statement that is done within 45 seconds, with a result of at most 1 MiB in the types the Data API returns. Cast any other type to text in the query, like days::text. The local Postgres refuses what the Data API would, so a query that runs locally also runs deployed.',
		].join('\n')
	)
