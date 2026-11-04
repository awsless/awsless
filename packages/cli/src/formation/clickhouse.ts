import { createHash, randomInt } from 'crypto'
import { lookup } from 'dns/promises'
import { DeleteParameterCommand, GetParameterCommand, PutParameterCommand, SSMClient } from '@aws-sdk/client-ssm'
import { clickhouseClient, ClickHouseError, dropTableByName } from '@awsless/clickhouse'
import { createCustomProvider, createCustomResourceClass, Input, Output } from '@terraforge/core'
import { z } from 'zod'
import type { ClickHouseKey } from '../cli/ui/complex/fetch-clickhouse-key.js'
import { ExpectedError } from '../error.js'
import { alterTableStatements, applyTable } from '../feature/clickhouse/table.js'
import { isError, ProviderProps } from '../util/aws.js'

type PasswordInput = {
	parameter: Input<string>
}

type PasswordOutput = {
	parameter: Output<string>
	// The base64 sha256 the ClickHouse Cloud service takes instead of the
	// password, so the password itself never lands in the state.
	hash: Output<string>
}

// A generated password for the default user of the app's ClickHouse
// service, kept in an ssm SecureString where the lambdas read it.
export const ClickHousePassword = createCustomResourceClass<PasswordInput, PasswordOutput>(
	'clickhouse-data',
	'password'
)

type TableInput = {
	endpoint: Input<string>
	parameter: Input<string>
	name: Input<string>
	definition: Input<string>
}

type TableOutput = {
	endpoint: Output<string>
	parameter: Output<string>
	name: Output<string>
	definition: Output<string>
}

// A table inside the app's ClickHouse service, managed like a dynamodb
// table: the deploy creates it & alters its columns, indexes, ttl &
// settings to the stack file.
export const ClickHouseTable = createCustomResourceClass<TableInput, TableOutput>('clickhouse-data', 'table')

type BackupBucketInput = {
	serviceId: Input<string>
	// Like https://bucket.s3.amazonaws.com/clickhouse, where each backup
	// gets a folder of its own.
	bucketPath: Input<string>
	roleArn: Input<string>
	// The secret session name the role's trust requires.
	sessionName: Input<string>
}

type BackupBucketOutput = {
	serviceId: Output<string>
	bucketPath: Output<string>
	roleArn: Output<string>
	sessionName: Output<string>
}

// The service's backups written to a bucket of the app's own account as
// well, through a role the service assumes. The ClickHouse terraform
// provider can't do this yet, so it goes through the ClickHouse Cloud api.
export const ClickHouseBackupBucket = createCustomResourceClass<BackupBucketInput, BackupBucketOutput>(
	'clickhouse-data',
	'backup-bucket'
)

const passwordSchema = z.object({ parameter: z.string() })

const backupBucketSchema = z.object({
	serviceId: z.string(),
	bucketPath: z.string(),
	roleArn: z.string(),
	sessionName: z.string(),
})

const tableSchema = z.object({
	endpoint: z.string(),
	parameter: z.string(),
	name: z.string(),
	definition: z.string(),
})

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

// ClickHouse Cloud wants a lower & upper case letter, a digit & a
// special character in every password.
const generatePassword = () => {
	const random = Array.from({ length: 40 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('')

	return `Aa1_${random}`
}

export const hashPassword = (password: string) => {
	return createHash('sha256').update(password).digest('base64')
}

// An idle service wakes up on its first request & a new one needs a
// moment before its hostname resolves, so connection failures & gateway
// errors are retried for a few minutes. Anything else, like a refused
// table change or a missing parameter, fails right away.
const RETRY_CODES = new Set([
	'ECONNREFUSED',
	'ECONNRESET',
	'ENOTFOUND',
	'EAI_AGAIN',
	'ETIMEDOUT',
	'EPIPE',
	'UND_ERR_SOCKET',
])

const isTransient = (error: unknown) => {
	if (error instanceof ClickHouseError) return false

	const code =
		(error as { code?: string; cause?: { code?: string } }).code ??
		(error as { cause?: { code?: string } }).cause?.code

	if (code && RETRY_CODES.has(code)) return true

	return /socket hang up|fetch failed|\b50[234]\b|Timeout error/i.test(String(error))
}

// A deleted service's hostname stops resolving, so a table on it is gone
// too. A few tries keep a dns hiccup from passing for a deleted service.
export const serviceGone = async (endpoint: string, tries = 3, delay = 5000) => {
	const { hostname } = new URL(endpoint)

	for (let attempt = 1; ; attempt++) {
		try {
			await lookup(hostname)

			return false
		} catch (error) {
			if ((error as { code?: string }).code !== 'ENOTFOUND') {
				return false
			}

			if (attempt >= tries) {
				return true
			}
		}

		await new Promise(resolve => setTimeout(resolve, delay))
	}
}

const withRetry = async <T>(run: () => Promise<T>): Promise<T> => {
	const deadline = Date.now() + 5 * 60_000
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

export class ClickHouseApiError extends Error {
	constructor(
		readonly status: number,
		message: string
	) {
		super(message)
	}
}

const CLOUD_API = 'https://api.clickhouse.cloud/v1'

// The ClickHouse Cloud api, scoped to the key's organization.
export const createCloudApi = (key: ClickHouseKey) => {
	const authorization = `Basic ${Buffer.from(`${key.tokenKey}:${key.tokenSecret}`).toString('base64')}`

	return async <T = unknown>(method: string, path: string, body?: object): Promise<T | undefined> => {
		const response = await fetch(`${CLOUD_API}/organizations/${key.organizationId}${path}`, {
			method,
			headers: { authorization, 'content-type': 'application/json' },
			body: body ? JSON.stringify(body) : undefined,
		})

		const text = await response.text()

		if (!response.ok) {
			let reason = text

			try {
				reason = (JSON.parse(text) as { error?: string }).error ?? text
			} catch {}

			throw new ClickHouseApiError(
				response.status,
				`ClickHouse Cloud answered ${response.status} to ${method} ${path}: ${reason}`
			)
		}

		return text ? ((JSON.parse(text) as { result?: T }).result ?? undefined) : undefined
	}
}

// A new role takes a moment before anyone can assume it, and a service
// that's busy scaling or waking refuses changes for a while, so anything
// but a refused key or a missing service is retried for a few minutes.
const withApiRetry = async <T>(run: () => Promise<T>, deadline = Date.now() + 3 * 60_000): Promise<T> => {
	let attempt = 0

	while (true) {
		try {
			return await run()
		} catch (error) {
			const status = error instanceof ClickHouseApiError ? error.status : 0
			const final = status === 401 || status === 403 || status === 404

			if (final || Date.now() > deadline) {
				throw error
			}
		}

		attempt++
		await new Promise(resolve => setTimeout(resolve, Math.min(15_000, 2000 * attempt)))
	}
}

export type ClickHouseProviderProps = ProviderProps & {
	// Off while the whole app is deleted: deleting its service removes every
	// table with it, so there's no need to wake the service to drop them.
	dropTables?: boolean
	// The ClickHouse Cloud api key, for what the terraform provider can't do.
	cloudKey?: ClickHouseKey
	// Only for the tests, to skip the waits between retries.
	retryDeadline?: () => number
}

// Long enough for an idle service to wake up on the first request.
const REQUEST_TIMEOUT = 2 * 60_000

export const createClickHouseProvider = ({
	credentials,
	region,
	dropTables = true,
	cloudKey,
	retryDeadline,
}: ClickHouseProviderProps) => {
	const ssm = new SSMClient({ credentials, region })

	const cloudApi = () => {
		if (!cloudKey) {
			throw new ExpectedError(
				'ClickHouse backups to your own bucket need a ClickHouse Cloud API key. Run "awsless deploy" without --skip-prompt to store one.'
			)
		}

		return createCloudApi(cloudKey)
	}

	const backupBucketBody = (props: z.infer<typeof backupBucketSchema>) => ({
		bucketProvider: 'AWS',
		bucketPath: props.bucketPath,
		iamRoleArn: props.roleArn,
		iamRoleSessionName: props.sessionName,
	})

	// One backup bucket per service: a new one is posted, a known one patched.
	const applyBackupBucket = async (state: unknown) => {
		const props = backupBucketSchema.parse(state)
		const api = cloudApi()
		const path = `/services/${props.serviceId}/backupBucket`

		await withApiRetry(async () => {
			let existing: unknown

			try {
				existing = await api('GET', path)
			} catch (error) {
				if (!(error instanceof ClickHouseApiError && error.status === 404)) {
					throw error
				}
			}

			await api(existing ? 'PATCH' : 'POST', path, backupBucketBody(props))
		}, retryDeadline?.())

		return props
	}

	const getPassword = async (parameter: string) => {
		const result = await ssm.send(new GetParameterCommand({ Name: parameter, WithDecryption: true }))

		return result.Parameter?.Value ?? ''
	}

	const getClient = (props: { endpoint: string; parameter: string }) => {
		return clickhouseClient({
			endpoint: props.endpoint,
			password: () => getPassword(props.parameter),
			requestTimeout: REQUEST_TIMEOUT,
			// The retries below decide what's an error.
			silent: true,
		})
	}

	const createPassword = async (state: unknown) => {
		const props = passwordSchema.parse(state)
		const password = generatePassword()

		await ssm.send(
			new PutParameterCommand({
				Name: props.parameter,
				Type: 'SecureString',
				Value: password,
				Overwrite: true,
			})
		)

		return { ...props, hash: hashPassword(password) }
	}

	const applyDefinition = async (state: unknown) => {
		const props = tableSchema.parse(state)

		const client = getClient(props)

		try {
			await withRetry(() => applyTable(client, props.name, JSON.parse(props.definition)))
		} finally {
			await client.close()
		}

		return props
	}

	return createCustomProvider('clickhouse-data', {
		'backup-bucket': {
			async createResource(props) {
				return applyBackupBucket(props.state)
			},
			async updateResource(props) {
				return applyBackupBucket(props.proposedState)
			},
			// A new service starts without a backup bucket.
			async planResourceChange(props) {
				const prior = props.priorState as { serviceId?: string } | null
				const proposed = props.proposedState as { serviceId?: string } | null

				return {
					state: props.proposedState,
					requiresReplacement: !!prior && prior.serviceId !== proposed?.serviceId,
				}
			},
			// The backups already written stay in the bucket. A service that's
			// gone took its backup bucket setting with it.
			async deleteResource(props) {
				const { serviceId } = backupBucketSchema.parse(props.state)

				try {
					await cloudApi()('DELETE', `/services/${serviceId}/backupBucket`)
				} catch (error) {
					if (!(error instanceof ClickHouseApiError && error.status === 404)) {
						throw error
					}
				}
			},
		},
		password: {
			async createResource(props) {
				return createPassword(props.state)
			},
			// A password belongs to its parameter, so a new parameter gets a
			// new password & the service follows its hash.
			async planResourceChange(props) {
				const prior = props.priorState as { parameter?: string; hash?: string } | null
				const proposed = props.proposedState as { parameter?: string } | null
				const replace = !!prior && prior.parameter !== proposed?.parameter

				return {
					state: replace || !prior ? props.proposedState : { ...props.proposedState, hash: prior.hash },
					requiresReplacement: replace,
				}
			},
			async updateResource(props) {
				const prior = props.priorState as { hash: string }

				return { ...passwordSchema.parse(props.proposedState), hash: prior.hash }
			},
			async deleteResource(props) {
				const { parameter } = passwordSchema.parse(props.state)

				try {
					await ssm.send(new DeleteParameterCommand({ Name: parameter }))
				} catch (error) {
					if (!isError(error, 'ParameterNotFound')) {
						throw error
					}
				}
			},
		},
		table: {
			async createResource(props) {
				return applyDefinition(props.state)
			},
			async updateResource(props) {
				return applyDefinition(props.proposedState)
			},
			// A table can't move to another service or name in place, so that
			// replaces it. A new engine or key fails here, before anything
			// deploys, instead of rewriting every row.
			async planResourceChange(props) {
				const prior = props.priorState as z.infer<typeof tableSchema> | null
				const proposed = props.proposedState as z.infer<typeof tableSchema> | null
				const replace = !!prior && (prior.endpoint !== proposed?.endpoint || prior.name !== proposed?.name)

				if (prior && proposed && !replace && typeof proposed.definition === 'string') {
					alterTableStatements(proposed.name, JSON.parse(prior.definition), JSON.parse(proposed.definition))
				}

				return {
					state: props.proposedState,
					requiresReplacement: replace,
				}
			},
			// Removing the resource drops the table & its data.
			async deleteResource(props) {
				const state = tableSchema.parse(props.state)

				if (!dropTables || (await serviceGone(state.endpoint))) {
					return
				}

				const client = getClient(state)

				try {
					await withRetry(() => dropTableByName(client, state.name))
				} finally {
					await client.close()
				}
			},
		},
	})
}
