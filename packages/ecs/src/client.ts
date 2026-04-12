import { ECSClient } from '@aws-sdk/client-ecs'
import { globalClient } from '@awsless/utils'

export const ecsClient = globalClient(() => {
	return new ECSClient({})
})
