import { days, minutes } from '@awsless/duration'
import { z } from 'zod'
import { DurationSchema, durationMax, durationMin } from '../../config/schema/duration.js'

const MemorySchema = z
	.number()
	.int()
	.refine(value => value >= 8 && value % 4 === 0, 'Memory must be a multiple of 4 GiB, from 8 GiB.')

// The one ClickHouse Cloud service of the app, created as soon as any
// stack declares a ClickHouse table.
export const ClickHouseDefaultSchema = z
	.object({
		region: z
			.string()
			.optional()
			.describe('The ClickHouse Cloud region on AWS, like "eu-west-1". Defaults to the region of your app.'),
		memory: z
			.object({
				min: MemorySchema.default(8).describe('The minimum memory of a replica, in GiB.'),
				max: MemorySchema.default(12).describe('The maximum memory of a replica, in GiB, capping the cost.'),
			})
			.strict()
			.refine(memory => memory.min <= memory.max, 'The minimum memory can not exceed the maximum.')
			.prefault({})
			.describe('The memory range a replica scales in, between requests.'),
		replicas: z
			.number()
			.int()
			.min(1)
			.optional()
			.describe('A fixed number of replicas. Leave it out for the tier default.'),
		idleTimeout: DurationSchema.refine(durationMin(minutes(5)), 'The idle timeout can not be under 5 minutes.')
			.refine(durationMax(days(1)), 'The idle timeout can not be over a day.')
			.prefault('15 minutes')
			.describe(
				'How long the service waits without queries before it scales to zero. The first query after that wakes it up, which takes a little while.'
			),
		idle: z
			.boolean()
			.default(true)
			.describe('Scale to zero when idle. Turn it off to keep the service warm & answer every query right away.'),
		ipAccess: z
			.array(z.string())
			.default(['0.0.0.0/0'])
			.describe(
				'The IPv4 addresses or CIDRs that can reach the service. Lambdas call it from changing AWS addresses, so the default allows any, guarded by the generated password & TLS.'
			),
		releaseChannel: z
			.enum(['default', 'fast', 'slow'])
			.optional()
			.describe('How soon the service gets new ClickHouse versions.'),
	})
	.strict()
	.prefault({})
	.describe(
		'Configure the ClickHouse Cloud service that holds every ClickHouse table in your app. Deploying needs a ClickHouse Cloud API key in CLICKHOUSE_ORG_ID, CLICKHOUSE_CLOUD_API_KEY & CLICKHOUSE_CLOUD_API_SECRET.'
	)

const NameSchema = z
	.string()
	.regex(
		/^[a-z][a-z0-9-_]*$/,
		'ClickHouse table names must be lowercase & start with a letter, like "events" or "page_views".'
	)

const ColumnNameSchema = z
	.string()
	.regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, 'Column names start with a letter or underscore, like "createdAt".')

// Friendly names for the column types apps use most, each standing for the
// ClickHouse type the deploy creates. `[]` makes an array, `?` lets it be
// NULL. Any ClickHouse type works too, written as ClickHouse writes it.
const SHORTHANDS = {
	string: { type: 'String', description: 'Text of any kind, like ids or user agents.' },
	keyword: {
		type: 'LowCardinality(String)',
		description:
			'Text that repeats a lot, like countries, tags or ids of a few thousand projects: stored once & far smaller.',
	},
	number: { type: 'Float64', description: 'A number with decimals, like a score.' },
	integer: { type: 'Int64', description: 'A whole number that can be negative.' },
	count: { type: 'UInt64', description: 'A whole number of zero or more.' },
	boolean: { type: 'Bool', description: 'True or false.' },
	uuid: { type: 'UUID', description: 'A UUID.' },
	date: { type: "DateTime64(3, 'UTC')", description: 'A moment in time to the millisecond, in UTC.' },
	day: { type: 'Date', description: 'A calendar day, without a time.' },
	ip: { type: 'IPv6', description: 'An IPv4 or IPv6 address.' },
	json: { type: 'JSON', description: 'A JSON object, with fast access to each of its paths.' },
} as const

type Shorthand = keyof typeof SHORTHANDS

// "keyword[]?" style names to ClickHouse types; anything else is taken as
// a ClickHouse type already.
export const resolveColumnType = (type: string): string => {
	const match = /^([a-z]+)(\[\])?(\?)?$/.exec(type.trim())

	if (!match || !(match[1]! in SHORTHANDS)) {
		return type
	}

	const base = SHORTHANDS[match[1] as Shorthand].type
	const nullable = (inner: string) => {
		const low = /^LowCardinality\((.*)\)$/.exec(inner)
		return low ? `LowCardinality(Nullable(${low[1]}))` : `Nullable(${inner})`
	}

	if (match[2]) {
		return `Array(${match[3] ? nullable(base) : base})`
	}

	return match[3] ? nullable(base) : base
}

const suggestions = Object.entries(SHORTHANDS).flatMap(([name, { type, description }]) => [
	z.literal(name).describe(`${description} (${type})`),
	z
		.literal(`${name}[]`)
		.describe(`A list of: ${description.charAt(0).toLowerCase()}${description.slice(1)} (Array(${type}))`),
	z.literal(`${name}?`).describe(`${description} Or nothing (NULL).`),
])

const TypeSchema = z
	.union([...suggestions, z.string().min(1)] as unknown as [z.ZodString, ...z.ZodString[]])
	.transform(resolveColumnType)
	.describe(
		'The column type: a friendly name like "string", "keyword", "number", "date" or "keyword[]" (a list) or "string?" (may be NULL), or any ClickHouse type like "Decimal(18, 4)".'
	)

const ColumnSchema = z.union([
	TypeSchema,
	z
		.object({
			type: TypeSchema,
			default: z
				.string()
				.optional()
				.describe('An expression that fills the column when an insert leaves it out.'),
			materialized: z.string().optional().describe('An expression the column is always computed from.'),
			codec: z.string().optional().describe('The compression codec, like "ZSTD(3)" or "Delta, ZSTD".'),
			comment: z.string().optional(),
		})
		.strict(),
])

const TableSchema = z
	.object({
		columns: z
			.record(ColumnNameSchema, ColumnSchema)
			.refine(columns => Object.keys(columns).length > 0, 'A table needs at least one column.')
			.describe('The columns in order, each with its type.'),
		engine: z
			.string()
			.optional()
			.describe('The table engine, like "ReplacingMergeTree(updatedAt)". Defaults to "MergeTree".'),
		orderBy: z
			.array(z.string())
			.optional()
			.describe(
				'The sort key: the columns or expressions queries filter on most, like ["projectId", "createdAt"]. It can not change after the table exists.'
			),
		partitionBy: z
			.string()
			.optional()
			.describe('How the rows are split into parts, like "toYYYYMM(createdAt)". It can not change later.'),
		primaryKey: z
			.array(z.string())
			.optional()
			.describe('A prefix of the sort key to index, when it differs from the sort key.'),
		ttl: z.string().optional().describe('When rows expire, like "toDateTime(createdAt) + INTERVAL 1 YEAR".'),
		indexes: z
			.record(
				ColumnNameSchema,
				z
					.object({
						expression: z.string().describe('The column or expression to index.'),
						type: z.string().describe('The index type, like "bloom_filter" or "set(100)".'),
						granularity: z.number().int().min(1).optional(),
					})
					.strict()
			)
			.optional()
			.describe('Data skipping indexes, for columns the sort key does not cover.'),
		settings: z
			.record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
			.optional()
			.describe('Table settings, like { "index_granularity": 8192 }.'),
	})
	.strict()

export const ClickHouseSchema = z
	.record(NameSchema, TableSchema)
	.optional()
	.describe(
		'Define the ClickHouse tables in your stack, all in the one ClickHouse Cloud service of your app. The physical table name is prefixed with the stack name. Columns & indexes change in place, the engine & keys can not.'
	)
