import { SSMClient } from '@aws-sdk/client-ssm'
import { globalClient } from '@awsless/utils'

// Parameter Store's default throughput is shared by every function in the
// account and region, so a burst of cold starts elsewhere throttles a
// lambda's config load. Five attempts (the SDK's default is three) ride out
// a short burst with its jittered backoff, within Lambda's 10 s init.
const MAX_ATTEMPTS = 5

export const ssmClient = globalClient(() => {
	return new SSMClient({ maxAttempts: MAX_ATTEMPTS })
})
