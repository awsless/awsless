import { Duration } from '@awsless/duration'
import { Handler } from '@awsless/lambda'
import { InferOutput, object, string } from '@awsless/validate'
import { consumer } from './util.js'

// The response contract of the rpc authorizer: which functions the
// caller may invoke, the lock key for one-at-a-time callers & how long
// the session stays valid.
export type RpcAuthResult =
	| {
			authorized: true
			ttl: Duration
			context?: Record<string, unknown>
			allowedFunctions?: string[]
			lockKey?: string
	  }
	| {
			authorized: false
	  }

const authEventSchema = object({
	token: string(),
})

// The event the authorizer receives & the contract it returns.
export type AuthEvent = InferOutput<typeof authEventSchema>
export type AuthResponse = RpcAuthResult

export const auth = <H extends Handler<typeof authEventSchema, RpcAuthResult | Promise<RpcAuthResult>>>(
	handle: H
) => {
	return consumer(authEventSchema, handle)
}
