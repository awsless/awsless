import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts'
import { createCredentialChain, fromNodeProviderChain } from '@aws-sdk/credential-providers'
import { AwsCredentialIdentityProvider } from '@aws-sdk/types'
import { fetchCredentials } from '../cli/ui/complex/fetch-credentials.js'
import { Region } from '../config/schema/region.js'

export type Credentials = AwsCredentialIdentityProvider

// What every custom provider & most sdk clients need to talk to aws.
export type ProviderProps = {
	credentials: Credentials
	region: Region
}

export const isError = (error: unknown, name: string) => {
	return error instanceof Error && error.name === name
}

const hasRuntimeAwsCredentials = () =>
	!!(
		process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI ||
		process.env.AWS_CONTAINER_CREDENTIALS_FULL_URI ||
		process.env.AWS_ACCESS_KEY_ID ||
		process.env.AWS_WEB_IDENTITY_TOKEN_FILE
	)

// Fetching credentials can prompt & the account lookup is an STS
// call, so both are memoized per process: a command fetches them once
// up front & the locked deploy path reuses the same objects.
const credentialCache = new Map<string, Promise<Credentials>>()
const accountCache = new WeakMap<Credentials, Map<string, Promise<string>>>()

const memoize = <K, V>(cache: Map<K, Promise<V>>, key: K, load: () => Promise<V>) => {
	let pending = cache.get(key)

	if (!pending) {
		pending = load()
		cache.set(key, pending)

		// A failed lookup must not poison the next attempt.
		pending.catch(() => cache.delete(key))
	}

	return pending
}

export const getCredentials = (profile: string): Promise<Credentials> => {
	return memoize(credentialCache, profile, async () => {
		if (hasRuntimeAwsCredentials()) {
			return fromNodeProviderChain()
		}

		const credentials = await fetchCredentials(profile)

		return createCredentialChain(async () => {
			return credentials
		})
	})
}

export const getAccountId = (credentials: Credentials, region: Region): Promise<string> => {
	let regions = accountCache.get(credentials)

	if (!regions) {
		regions = new Map()
		accountCache.set(credentials, regions)
	}

	return memoize(regions, region, async () => {
		const client = new STSClient({ credentials, region })
		const result = await client.send(new GetCallerIdentityCommand({}))

		return result.Account!
	})
}

// Test hook, so every test starts without a remembered session.
export const clearAwsCache = () => {
	credentialCache.clear()
}
