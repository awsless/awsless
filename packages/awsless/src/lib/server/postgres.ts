import { postgresClient, postgresDataClient, type PostgresClient } from '@awsless/postgres'
import { trace } from '@awsless/utils'
import { kebabCase } from 'change-case'
import { createProxy } from '../proxy.js'
import { registerTestCleanup } from '../test/cleanup.js'
import { ensureTestSchema } from '../test/schema.js'
import { getApp, getStack, isTest } from './util.js'

export { getSqlState, PostgresError } from '@awsless/postgres'

// The schema of a stack, also used by the CLI: inside the one database
// locally, and with a database of the same name around it on Aurora.
// Underscores, so sql never has to quote it.
export const getPostgresSchemaName = (stackName: string) => {
	return kebabCase(stackName).replaceAll('-', '_')
}

export const getPostgresProps = (stack: string = getStack()) => {
	const schema = getPostgresSchemaName(stack)

	return {
		// Every test file shares one Postgres server, so the per-file app
		// prefix keeps their schemas apart.
		schema: isTest() ? `${getPostgresSchemaName(getApp())}__${schema}` : schema,
	} as const
}

// How a stack's queries reach its database. Locally & in tests the CLI
// starts a server and hands over its url. Deployed, they go through the
// RDS Data API to the app's Aurora cluster: no connection, pool or password.
const createClient = (schema: string): PostgresClient => {
	const url = process.env.POSTGRES_URL

	if (url) {
		// Strict: what the Data API would refuse is refused here too, so a
		// query that runs locally also runs deployed.
		return postgresClient({ url, schema, strict: true })
	}

	const clusterArn = process.env.POSTGRES_CLUSTER_ARN
	const secretArn = process.env.POSTGRES_SECRET_ARN

	if (clusterArn && secretArn) {
		// On the cluster a stack has a database of its own, named like its
		// schema, that sets the search path itself: the Data API keeps no
		// session setting from one call to the next.
		return postgresDataClient({ clusterArn, secretArn, database: schema })
	}

	throw new Error(
		'Postgres has no database to query. Locally `awsless dev` and `awsless test` set POSTGRES_URL; a deployed function gets POSTGRES_CLUSTER_ARN and POSTGRES_SECRET_ARN when its app has a stack with Postgres tables.'
	)
}

const clients = new Map<string, PostgresClient>()

// One client per schema for the life of the lambda container, shared by
// every invocation: locally, opening a connection costs far more than a query.
const getClient = (schema: string) => {
	let client = clients.get(schema)

	if (!client) {
		const created = createClient(schema)

		// A test file's connections close with the file.
		if (isTest()) {
			registerTestCleanup(() => {
				clients.delete(schema)

				return created.close()
			})
		}

		clients.set(schema, created)
		client = created
	}

	return client
}

export type PostgresDatabase = {
	readonly schema: string
	readonly query: <Row = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<Row[]>
}

export interface PostgresResources {}

export const Postgres: PostgresResources = /*@__PURE__*/ createProxy(stack => {
	const database: PostgresDatabase = {
		get schema() {
			return getPostgresProps(stack).schema
		},
		// A span per query, named by the schema alone: the sql and its
		// params stay out of the trace.
		query<Row = Record<string, unknown>>(sql: string, params?: unknown[]) {
			const { schema } = getPostgresProps(stack)

			return trace(
				'Postgres',
				async () => {
					// Only a test file has schemas that wait to be made.
					await ensureTestSchema(schema)

					return getClient(schema).query<Row>(sql, params)
				},
				{
					namespace: 'remote',
					annotations: { postgres_operation: 'query' },
					metadata: { schema },
				}
			)
		},
	}

	return database
})
