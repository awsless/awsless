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

const ColumnSchema = z.union([
	z
		.string()
		.min(1)
		.describe('The ClickHouse type, like "String", "LowCardinality(String)" or "DateTime64(3, \'UTC\')".'),
	z
		.object({
			type: z.string().min(1).describe('The ClickHouse type.'),
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
			.describe('The columns in order, each with its ClickHouse type.'),
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
