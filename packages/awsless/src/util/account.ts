
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts'
import { Credentials } from './credentials'
import { Region } from './region'

export const getAccountId = async (credentials:Credentials, region:Region): Promise<string> => {
	const client = new STSClient({ credentials, region })
	const result = await client.send(new GetCallerIdentityCommand({}))

	return result.Account!
}
