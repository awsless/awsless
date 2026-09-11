import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts'
import { createCredentialChain, fromNodeProviderChain } from '@aws-sdk/credential-providers'
import { AwsCredentialIdentityProvider } from '@aws-sdk/types'
import { fetchCredentials } from '../cli/ui/complex/fetch-credentials.js'
import { Region } from '../config/schema/region.js'
import { ExpectedError } from '../error.js'
import { isRemoteAgent } from './remote-agent.js'

export type Credentials = AwsCredentialIdentityProvider

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

// A remote agent never gets to a keychain or a prompt: the env vars are
// the only source, and they are checked up front so a missing key
// fails with a clear message instead of a stalled aws call later.
const getRemoteAgentCredentials = async (profile: string): Promise<Credentials> => {
	// The sandbox can't reach the instance metadata endpoint, and the
	// provider chain would otherwise wait on it.
	process.env.AWS_EC2_METADATA_DISABLED ??= 'true'

	const provider = fromNodeProviderChain()

	try {
		await provider()
	} catch (error) {
		throw new ExpectedError(
			`No AWS credentials found for the ${profile} profile while running as a remote agent. ` +
				`Set AWS_ACCESS_KEY_ID & AWS_SECRET_ACCESS_KEY in the environment.`,
			{ cause: error }
		)
	}

	return provider
}

export const getCredentials = async (profile: string): Promise<Credentials> => {
	if (isRemoteAgent()) {
		return getRemoteAgentCredentials(profile)
	}

	if (hasRuntimeAwsCredentials()) {
		return fromNodeProviderChain()
	}

	const credentials = await fetchCredentials(profile)

	return createCredentialChain(async () => {
		return credentials
	})
}

export const getAccountId = async (credentials: Credentials, region: Region): Promise<string> => {
	const client = new STSClient({ credentials, region })
	const result = await client.send(new GetCallerIdentityCommand({}))

	return result.Account!
}
