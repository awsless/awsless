import { define, object, string, ttl } from '@awsless/dynamodb'
import { getRouteEnv } from 'awsless'

export const getLockTable = () => {
	return define(getRouteEnv('LOCK_TABLE') ?? 'lock', {
		hash: 'key',
		schema: object({
			key: string(),
			ttl: ttl(),
			requestId: string(),
		}),
	})
}
