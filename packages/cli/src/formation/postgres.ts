import { RDSDataClient } from '@aws-sdk/client-rds-data'
import {
	alterTableStatements,
	applySchema,
	getSqlState,
	postgresDataClient,
	PostgresError,
	TableChangeError,
	type TableDefinition,
} from '@awsless/postgres'
import { createCustomProvider, createCustomResourceClass, Input, Output } from '@terraforge/core'
import { z } from 'zod'
import { ProviderProps } from '../util/aws.js'

type SchemaInput = {
	// The app's Aurora cluster & the secret of its master user.
	clusterArn: Input<string>
	secretArn: Input<string>
	// The stack's own database on the cluster, and its schema inside it.
	database: Input<string>
	schema: Input<string>
	// The declared tables by name, as JSON.
	tables: Input<string>
	// The function files as JSON: their name & what they hold, in order.
	functions: Input<string>
	// Keep a table that left the declaration, for an app that retains its data.
	retain: Input<boolean>
}

type SchemaOutput = {
	clusterArn: Output<string>
	secretArn: Output<string>
	database: Output<string>
	schema: Output<string>
	tables: Output<string>
	functions: Output<string>
	retain: Output<boolean>
}

// A stack's Postgres schema on the app's Aurora cluster, managed like a
// ClickHouse table: the deploy creates its tables & changes them to the
// stack file, and runs its function files, through the RDS Data API.
export const PostgresSchemaResource = createCustomResourceClass<SchemaInput, SchemaOutput>('postgres-data', 'schema')

// Names that go into sql as written.
const NameSchema = z.string().regex(/^[a-z0-9_]{1,63}$/)

const schemaSchema = z.object({
	clusterArn: z.string(),
	secretArn: z.string(),
	database: NameSchema,
	schema: NameSchema,
	tables: z.string(),
	functions: z.string(),
	retain: z.boolean().default(false),
})

type SchemaState = z.infer<typeof schemaSchema>

const DUPLICATE_DATABASE = '42P04'
const MISSING_DATABASE = '3D000'

// What the service answers while it can't take a call that it will take
// in a moment: a writer that restarts, a secret that isn't readable yet
// on a new cluster, a busy or failing endpoint. A paused cluster is the
// data client's own wait.
const RETRY_NAMES = new Set([
	'DatabaseUnavailableException',
	'InternalServerErrorException',
	'ServiceUnavailableError',
	'ServiceUnavailableException',
	'ThrottlingException',
	'TooManyRequestsException',
	'SecretsErrorException',
	'TimeoutError',
])

const RETRY_CODES = new Set(['ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND', 'EAI_AGAIN', 'ETIMEDOUT', 'EPIPE'])

// Anything Postgres itself answered is final: a refused table change, a
// statement of a function file that fails. Trying again changes nothing.
const isTransient = (error: unknown) => {
	if (error instanceof PostgresError || error instanceof TableChangeError) {
		return false
	}

	const { name, code, cause } = error as { name?: string; code?: string; cause?: { code?: string } }

	return RETRY_NAMES.has(name ?? '') || RETRY_CODES.has(code ?? cause?.code ?? '')
}

// A cluster or database that is gone took the schema with it.
const isGone = (error: unknown) => {
	if (getSqlState(error) === MISSING_DATABASE) {
		return true
	}

	const { name, message } = error as { name?: string; message?: string }

	return (
		name === 'DatabaseNotFoundException' ||
		(name === 'BadRequestException' && /not found|does not exist|doesn't exist/i.test(message ?? ''))
	)
}

export type PostgresProviderProps = ProviderProps & {
	// Off while the whole app is deleted: deleting its cluster removes every
	// schema with it, so there's no need to resume the cluster to drop them.
	dropSchemas?: boolean
	// Only for the tests, to skip the waits between retries.
	retryDeadline?: () => number
}

// A paused cluster resumes in about 15 seconds, and a new one can take a
// few minutes before its writer answers. Also how long a failed apply is
// tried again.
const RESUME_TIMEOUT = 5 * 60_000

export const createPostgresProvider = ({
	credentials,
	region,
	dropSchemas = true,
	retryDeadline,
}: PostgresProviderProps) => {
	// One try per call: the retries below decide what runs again.
	const api = new RDSDataClient({ credentials, region, maxAttempts: 1 })

	const getClient = (props: SchemaState, database: string) => {
		return postgresDataClient({
			clusterArn: props.clusterArn,
			secretArn: props.secretArn,
			database,
			client: api,
			resumeTimeout: RESUME_TIMEOUT,
		})
	}

	// An apply is one transaction that changes nothing it finds done, so a
	// whole apply can run again after a call that failed on the way.
	const withRetry = async <T>(run: () => Promise<T>): Promise<T> => {
		const deadline = retryDeadline?.() ?? Date.now() + RESUME_TIMEOUT
		let attempt = 0

		while (true) {
			try {
				return await run()
			} catch (error) {
				if (!isTransient(error) || Date.now() > deadline) {
					throw error
				}
			}

			attempt++
			await new Promise(resolve => setTimeout(resolve, Math.min(10_000, 1000 * attempt)))
		}
	}

	// The Data API resets a session before the next call uses it, so a
	// search path set per query wouldn't hold. A stack gets a database of
	// its own instead, that sets the search path for every session in it.
	const ensureDatabase = async (props: SchemaState) => {
		const admin = getClient(props, 'postgres')

		try {
			await admin.query(`CREATE DATABASE "${props.database}"`)
		} catch (error) {
			// Made by an earlier deploy or apply.
			if (getSqlState(error) !== DUPLICATE_DATABASE) {
				throw error
			}
		}

		await admin.query(`ALTER DATABASE "${props.database}" SET search_path TO "${props.schema}", public`)
	}

	const applyDefinition = async (state: unknown) => {
		const props = schemaSchema.parse(state)

		await withRetry(async () => {
			await ensureDatabase(props)
			await applySchema(
				getClient(props, props.database),
				{
					schema: props.schema,
					tables: JSON.parse(props.tables),
					functions: JSON.parse(props.functions),
				},
				{ retain: props.retain }
			)
		})

		return props
	}

	return createCustomProvider('postgres-data', {
		schema: {
			async createResource(props) {
				return applyDefinition(props.state)
			},
			async updateResource(props) {
				return applyDefinition(props.proposedState)
			},
			// A schema can't move to another database or name in place, so that
			// replaces it. A table change that Postgres can't make in place, like
			// another primary key, fails here, before anything deploys.
			async planResourceChange(props) {
				const prior = props.priorState as SchemaState | null
				const proposed = props.proposedState as SchemaState | null
				const replace = !!prior && (prior.database !== proposed?.database || prior.schema !== proposed?.schema)

				// On another cluster the tables are made new, so nothing changes in place.
				const sameCluster = prior?.clusterArn === proposed?.clusterArn

				if (prior && proposed && !replace && sameCluster && typeof proposed.tables === 'string') {
					const before = JSON.parse(prior.tables) as Record<string, TableDefinition>
					const after = JSON.parse(proposed.tables) as Record<string, TableDefinition>

					for (const [name, table] of Object.entries(after)) {
						if (before[name]) {
							alterTableStatements(name, before[name], table)
						}
					}
				}

				return {
					state: props.proposedState,
					requiresReplacement: replace,
				}
			},
			// Removing the resource drops the tables awsless made & every
			// function of the schema. The database itself stays, with whatever
			// else was put in it.
			async deleteResource(props) {
				const state = schemaSchema.parse(props.state)

				if (!dropSchemas) {
					return
				}

				try {
					await withRetry(() => {
						return applySchema(getClient(state, state.database), {
							schema: state.schema,
							tables: {},
							functions: [],
						})
					})
				} catch (error) {
					if (!isGone(error)) {
						throw error
					}
				}
			},
		},
	})
}
