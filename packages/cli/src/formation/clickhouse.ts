import { createHash, randomInt } from 'crypto'
import { DeleteParameterCommand, GetParameterCommand, PutParameterCommand, SSMClient } from '@aws-sdk/client-ssm'
import { clickhouseClient, ClickHouseError, dropTableByName } from '@awsless/clickhouse'
import { createCustomProvider, createCustomResourceClass, Input, Output } from '@terraforge/core'
import { z } from 'zod'
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

const passwordSchema = z.object({ parameter: z.string() })

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

export const createClickHouseProvider = ({ credentials, region }: ProviderProps) => {
	const ssm = new SSMClient({ credentials, region })

	const getPassword = async (parameter: string) => {
		const result = await ssm.send(new GetParameterCommand({ Name: parameter, WithDecryption: true }))

		return result.Parameter?.Value ?? ''
	}

	const getClient = (props: { endpoint: string; parameter: string }) => {
		return clickhouseClient({
			endpoint: props.endpoint,
			password: () => getPassword(props.parameter),
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
