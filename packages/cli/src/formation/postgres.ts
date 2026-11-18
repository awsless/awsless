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
	// The app's database on the cluster, and the stack's schema inside it.
	database: Input<string>
	schema: Input<string>
	// The schema of every stack, comma separated, in the order unqualified
	// names resolve in.
	searchPath: Input<string>
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
	searchPath: Output<string>
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
	// Without it, a state from before the app had one database: the stack alone.
	searchPath: z
		.string()
		.regex(/^[a-z0-9_,]*$/)
		.default(''),
	tables: z.string(),
	functions: z.string(),
	retain: z.boolean().default(false),
})

type SchemaState = z.infer<typeof schemaSchema>

const DUPLICATE_DATABASE = '42P04'
// Two stacks that make the app's database at the same moment: the one that
// loses is told its name is taken, in the words of the catalog's index.
const UNIQUE_VIOLATION = '23505'
const MISSING_DATABASE = '3D000'
const DATABASE_IN_USE = '55006'

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

	const hasDatabase = async (admin: ReturnType<typeof getClient>, database: string) => {
		const rows = await admin.query('SELECT 1 AS found FROM pg_database WHERE datname = $1', [database])

		return rows.length > 0
	}

	// Before an app had one database, every stack had a database of its own,
	// named like its schema. The first stack to deploy brings its database
	// along as the app's, with everything in it. Postgres has no way to move
	// tables between databases, so a second one is left for its owner to move.
	const adoptDatabase = async (props: SchemaState, legacy: string) => {
		const admin = getClient(props, 'postgres')

		if (!(await hasDatabase(admin, legacy))) {
			return
		}

		if (await hasDatabase(admin, props.database)) {
			throw new PostgresError(
				`The Postgres tables of schema "${props.schema}" are in a database of their own ("${legacy}"), from before an app had one database. Another stack's database already became the app's ("${props.database}"), and Postgres can't move tables between databases. Copy the tables of "${legacy}" into schema "${props.schema}" of "${props.database}", drop the database "${legacy}", and deploy again.`,
				0,
				'error'
			)
		}

		// A database with a session in it can't be renamed, and the Data API
		// keeps its sessions around.
		for (let attempt = 0; ; attempt++) {
			await admin.query(
				'SELECT pg_terminate_backend(pid)::text FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()',
				[legacy]
			)

			try {
				await admin.query(`ALTER DATABASE "${legacy}" RENAME TO "${props.database}"`)
				return
			} catch (error) {
				if (getSqlState(error) !== DATABASE_IN_USE || attempt >= 5) {
					throw error
				}
			}
		}
	}

	// The Data API resets a session before the next call uses it, so a
	// search path set per query wouldn't hold. The app's database sets it
	// for every session instead: the schema of every stack, so a name
	// without a schema is found in whichever stack has it.
	const ensureDatabase = async (props: SchemaState) => {
		const admin = getClient(props, 'postgres')

		try {
			await admin.query(`CREATE DATABASE "${props.database}"`)
		} catch (error) {
			// Made by an earlier deploy or apply, or for another stack.
			const made = [DUPLICATE_DATABASE, UNIQUE_VIOLATION].includes(getSqlState(error) ?? '')

			if (!made || !(await hasDatabase(admin, props.database))) {
				throw error
			}
		}

		const schemas = (props.searchPath || props.schema).split(',').map(schema => `"${schema}"`)
		const setPath = `ALTER DATABASE "${props.database}" SET search_path TO ${[...schemas, 'public'].join(', ')}`

		// Every stack sets the same path. Two that do at the same moment
		// collide in the catalog, and the one that loses sets it again.
		for (let attempt = 0; ; attempt++) {
			try {
				await admin.query(setPath)
				return
			} catch (error) {
				const collided =
					getSqlState(error) === UNIQUE_VIOLATION || /concurrently updated/.test((error as Error).message)

				if (!collided || attempt >= 10) {
					throw error
				}
			}
		}
	}

	const applyDefinition = async (state: unknown, prior?: unknown) => {
		const props = schemaSchema.parse(state)
		const legacy = prior ? schemaSchema.parse(prior).database : props.database

		await withRetry(async () => {
			if (legacy !== props.database) {
				await adoptDatabase(props, legacy)
			}

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
				return applyDefinition(props.proposedState, props.priorState)
			},
			// A schema can't move to another name in place, so that replaces it.
			// A table change that Postgres can't make in place, like another
			// primary key, fails here, before anything deploys.
			async planResourceChange(props) {
				const prior = props.priorState as SchemaState | null
				const proposed = props.proposedState as SchemaState | null
				const replace = !!prior && prior.schema !== proposed?.schema

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
