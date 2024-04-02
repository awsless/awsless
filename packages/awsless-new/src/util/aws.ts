import { fromIni } from '@aws-sdk/credential-providers'
import { AwsCredentialIdentityProvider } from '@aws-sdk/types'
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts'
import { Region } from '../config/schema/region.js'

export type Credentials = AwsCredentialIdentityProvider

export const getCredentials = (profile: string): Credentials => {
	return fromIni({ profile })
}

export const getAccountId = async (credentials: Credentials, region: Region): Promise<string> => {
	const client = new STSClient({ credentials, region })
	const result = await client.send(new GetCallerIdentityCommand({}))

	return result.Account!
}
