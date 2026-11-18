import {
	postgresClient,
	postgresDataClient,
	postgresQueryBuilder,
	type PostgresClient,
	type PostgresQueryBuilder,
} from '@awsless/postgres'
import { trace } from '@awsless/utils'
import { kebabCase } from 'change-case'
import { registerTestCleanup } from '../test/cleanup.js'
import { ensureTestDatabase } from '../test/database.js'
import { getApp, isTest } from './util.js'

export {
	getSqlState,
	postgres,
	PostgresError,
	sql,
	type PostgresColumn,
	type PostgresFunction,
	type PostgresGenerated,
	type PostgresGeneratedAlways,
	type PostgresNumeric,
	type PostgresQueryBuilder,
} from '@awsless/postgres'

// An app has one database, with a schema per stack that declares tables.
// A table is `stack.table` in sql, so two stacks can each have an `events`
// and a query can join the tables of several stacks.

const toName = (name: string) => kebabCase(name).replaceAll('-', '_')

// The schema of a stack, also used by the CLI. Underscores, so sql never
// has to quote it.
export const getPostgresSchemaName = (stackName: string) => toName(stackName)

// The app's database, also used by the CLI. A test file runs under an app
// name of its own, which gives it a database of its own.
export const getPostgresDatabaseName = (appName: string = getApp()) => toName(appName)

// How the app's queries reach its database. Locally & in tests the CLI
// starts a server and hands over its url. Deployed, they go through the
// RDS Data API to the app's Aurora cluster: no connection, pool or password.
const createClient = (): PostgresClient => {
	const url = process.env.POSTGRES_URL

	if (url) {
		// The stacks' schemas, which the database itself lists when deployed.
		const schema = process.env.POSTGRES_SCHEMAS?.split(',').filter(Boolean)
		const target = new URL(url)

		// Every test file shares one server, with a database per file.
		if (isTest()) {
			target.pathname = `/${getPostgresDatabaseName()}`
		}

		// Strict: what the Data API would refuse is refused here too, so a
		// query that runs locally also runs deployed.
		return postgresClient({ url: target.toString(), schema, strict: true })
	}

	const clusterArn = process.env.POSTGRES_CLUSTER_ARN
	const secretArn = process.env.POSTGRES_SECRET_ARN
	const database = process.env.POSTGRES_DATABASE

	if (clusterArn && secretArn && database) {
		return postgresDataClient({ clusterArn, secretArn, database })
	}

	throw new Error(
		'Postgres has no database to query. Locally `awsless dev` and `awsless test` set POSTGRES_URL; a deployed function gets POSTGRES_CLUSTER_ARN, POSTGRES_SECRET_ARN and POSTGRES_DATABASE when its app has a stack with Postgres tables.'
	)
}

const clients = new Map<string, PostgresClient>()

// One client per database for the life of the lambda container, shared by
// every invocation: locally, opening a connection costs far more than a query.
const getClient = async () => {
	const database = getPostgresDatabaseName()

	// Only a test file has a database that waits to be made.
	await ensureTestDatabase(database)

	let client = clients.get(database)

	if (!client) {
		const created = createClient()

		// A test file's connections close with the file.
		if (isTest()) {
			registerTestCleanup(() => {
				clients.delete(database)

				return created.close()
			})
		}

		clients.set(database, created)
		client = created
	}

	return client
}

// A span per statement: the sql and its params stay out of the trace.
const traced = <T>(run: () => Promise<T>) => {
	return trace('Postgres', run, {
		namespace: 'remote',
		annotations: { postgres_operation: 'query' },
	})
}

// The tables of every stack, as `stack.table`: filled in by `awsless types`.
export interface PostgresTables {}

export type PostgresDatabase<Tables = PostgresTables> = {
	// Sql as written, with a row type given by hand.
	readonly query: <Row = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<Row[]>
	// A typed query builder (Kysely) over the tables the stack files declare.
	readonly db: PostgresQueryBuilder<Tables>
}

let builder: PostgresQueryBuilder<PostgresTables> | undefined

export const Postgres: PostgresDatabase = {
	query<Row = Record<string, unknown>>(sql: string, params?: unknown[]) {
		return traced(async () => (await getClient()).query<Row>(sql, params))
	},
	// It asks for the client on every statement, so it outlives a test
	// file's connections.
	get db() {
		builder ??= postgresQueryBuilder<PostgresTables>({ client: getClient, wrap: traced })

		return builder
	},
}
