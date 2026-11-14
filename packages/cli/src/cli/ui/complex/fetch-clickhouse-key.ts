import { log, prompt } from '@awsless/clui'
import { ExpectedError } from '../../../error.js'
import { isRemoteAgent } from '../../../util/remote-agent.js'
import { color } from '../style.js'

export type ClickHouseKey = {
	organizationId: string
	tokenKey: string
	tokenSecret: string
}

// Kept next to the aws credentials in the OS keychain, one key per aws
// account, since an account's apps share one ClickHouse Cloud organization.
const secretFor = (accountId: string) => ({ service: 'awsless', name: `clickhouse:${accountId}` })

// An api key belongs to one organization, which the api tells, so only the
// key itself is ever asked for. It also proves the key works before it's
// stored.
const organizationOf = async (tokenKey: string, tokenSecret: string) => {
	const response = await fetch('https://api.clickhouse.cloud/v1/organizations', {
		headers: { authorization: `Basic ${Buffer.from(`${tokenKey}:${tokenSecret}`).toString('base64')}` },
	})

	if (response.status === 401 || response.status === 403) {
		throw new ExpectedError('ClickHouse Cloud refused the API key. Check the key ID & secret.')
	}

	if (!response.ok) {
		throw new ExpectedError(
			`ClickHouse Cloud answered ${response.status} while looking up the API key's organization.`
		)
	}

	const { result } = (await response.json()) as { result?: { id: string; name: string }[] }
	const [organization, ...others] = result ?? []

	if (!organization) {
		throw new ExpectedError(`The ClickHouse Cloud API key has no organization.`)
	}

	if (others.length === 0) {
		return organization.id
	}

	return prompt.select({
		message: 'Which ClickHouse Cloud organization?',
		options: [organization, ...others].map(item => ({ value: item.id, label: item.name })),
	})
}

// Like the runtime aws credentials: the env overrides the keychain, for ci
// and remote agents. The organization may be left out there too.
const fromEnv = async (): Promise<ClickHouseKey | undefined> => {
	const { CLICKHOUSE_ORG_ID, CLICKHOUSE_CLOUD_API_KEY, CLICKHOUSE_CLOUD_API_SECRET } = process.env

	if (CLICKHOUSE_CLOUD_API_KEY && CLICKHOUSE_CLOUD_API_SECRET) {
		return {
			organizationId:
				CLICKHOUSE_ORG_ID || (await organizationOf(CLICKHOUSE_CLOUD_API_KEY, CLICKHOUSE_CLOUD_API_SECRET)),
			tokenKey: CLICKHOUSE_CLOUD_API_KEY,
			tokenSecret: CLICKHOUSE_CLOUD_API_SECRET,
		}
	}

	return
}

// No keychain without bun's secrets api, like under node in the tests.
const hasKeychain = () => typeof Bun !== 'undefined' && 'secrets' in Bun

const fromKeychain = async (accountId: string): Promise<ClickHouseKey | undefined> => {
	if (!hasKeychain()) {
		return
	}

	const stored = await Bun.secrets.get(secretFor(accountId))

	try {
		const key = stored ? (JSON.parse(stored) as Partial<ClickHouseKey>) : undefined

		if (key?.organizationId && key.tokenKey && key.tokenSecret) {
			return { organizationId: key.organizationId, tokenKey: key.tokenKey, tokenSecret: key.tokenSecret }
		}
	} catch {}

	return
}

export const missingClickHouseKey = (accountId: string) =>
	new ExpectedError(
		`Working with ClickHouse resources needs a ClickHouse Cloud API key for the AWS account ${accountId}. ` +
			`Run "awsless deploy" without --skip-prompt to store one.`
	)

// Asked & read once per account a process.
const cache = new Map<string, Promise<ClickHouseKey | undefined>>()

// The stored key, without ever prompting: for a deploy that may touch an old
// ClickHouse service without having tables, where a missing key only matters
// once it does.
export const loadClickHouseKey = async (accountId: string) => {
	return (await fromEnv()) ?? (await (cache.get(accountId) ?? fromKeychain(accountId)))
}

// Like the aws credentials: asks once & keeps the key in the keychain.
export const fetchClickHouseKey = (accountId: string): Promise<ClickHouseKey> => {
	let pending = cache.get(accountId) as Promise<ClickHouseKey> | undefined

	if (!pending) {
		pending = askOnce(accountId)
		cache.set(accountId, pending)

		// A cancelled prompt must not poison the next attempt.
		pending.catch(() => cache.delete(accountId))
	}

	return pending
}

const askOnce = async (accountId: string): Promise<ClickHouseKey> => {
	const known = (await fromEnv()) ?? (await fromKeychain(accountId))

	if (known) {
		return known
	}

	if (!hasKeychain()) {
		throw new ExpectedError(`Your current version of Bun doesn't support the Bun.secrets API. Please upgrade.`)
	}

	if (process.env.SKIP_PROMPT || isRemoteAgent()) {
		throw missingClickHouseKey(accountId)
	}

	log.warning(
		`You haven't configured a ClickHouse Cloud API key for the AWS account ${color.info(accountId)}. ` +
			`Create one with the Admin role under Organization > API keys in the ClickHouse Cloud console.`
	)

	const tokenKey = await prompt.password({
		message: 'Enter your ClickHouse Cloud API key ID',
		validate: (value: string | undefined) => (value?.trim() ? undefined : 'Invalid API key ID'),
	})

	const tokenSecret = await prompt.password({
		message: 'Enter your ClickHouse Cloud API key secret',
		validate: (value: string | undefined) => (value?.trim() ? undefined : 'Invalid API key secret'),
	})

	const organizationId = await organizationOf(tokenKey.trim(), tokenSecret.trim())

	const key = { organizationId, tokenKey: tokenKey.trim(), tokenSecret: tokenSecret.trim() }

	await log.task({
		initialMessage: 'Saving the ClickHouse Cloud API key ...',
		successMessage: 'ClickHouse Cloud API key saved successfully',
		errorMessage: 'Failed to save the ClickHouse Cloud API key',
		task: async () => {
			await Bun.secrets.set({ ...secretFor(accountId), value: JSON.stringify(key) })
		},
	})

	return key
}
