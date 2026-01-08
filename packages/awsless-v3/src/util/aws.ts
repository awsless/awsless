import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts'
import { createCredentialChain } from '@aws-sdk/credential-providers'
import { AwsCredentialIdentityProvider } from '@aws-sdk/types'
import { fetchCredentials } from '../cli/ui/complex/fetch-credentials.js'
import { Region } from '../config/schema/region.js'

export type Credentials = AwsCredentialIdentityProvider

export const getCredentials = async (profile: string): Promise<Credentials> => {
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
