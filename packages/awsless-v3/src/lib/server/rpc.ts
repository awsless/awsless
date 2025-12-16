import { Duration } from '@awsless/duration'

export type RpcAuthorizerResponse =
	| {
			authorized: false
	  }
	| {
			authorized: true
			context?: unknown
			lockKey?: string
			permissions?: string[]
			ttl: Duration
	  }
