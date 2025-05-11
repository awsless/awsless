import { DurationFormat } from '@awsless/duration'

export type RpcAuthorizerResponse =
	| {
			authorized: false
	  }
	| {
			authorized: true
			context?: unknown
			lockKey?: string
			ttl: DurationFormat
	  }
