import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts'
import { createCredentialChain, fromNodeProviderChain } from '@aws-sdk/credential-providers'
import { AwsCredentialIdentityProvider } from '@aws-sdk/types'
import { fetchCredentials } from '../cli/ui/complex/fetch-credentials.js'
import { Region } from '../config/schema/region.js'

export type Credentials = AwsCredentialIdentityProvider

const hasRuntimeAwsCredentials = () =>
	!!(
		process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI ||
		process.env.AWS_CONTAINER_CREDENTIALS_FULL_URI ||
		process.env.AWS_ACCESS_KEY_ID ||
		process.env.AWS_WEB_IDENTITY_TOKEN_FILE
	)

export const getCredentials = async (profile: string): Promise<Credentials> => {
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
