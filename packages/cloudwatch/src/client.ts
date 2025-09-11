import { CloudWatchClient } from '@aws-sdk/client-cloudwatch'
import { globalClient } from '@awsless/utils'

export const cloudWatchClient = globalClient(() => {
	return new CloudWatchClient({})
})
