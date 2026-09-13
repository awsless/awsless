import { Duration } from '@awsless/duration'
import { Handler } from '@awsless/lambda'
import { GenericSchema, InferInput, object, string } from '@awsless/validate'
import { consumer } from './util.js'

// The response contract of the rpc authorizer.
export type RpcAuthResult =
	| {
			/** Allow the caller. */
			authorized: true

			/** How long the authorization stays cached before the authorizer runs again. */
			ttl: Duration

			/** Extra data attached to the session. */
			context?: Record<string, unknown>

			/** The rpc function names the caller may invoke - every function when omitted. */
			allowedFunctions?: string[]

			/** Callers sharing this key run one request at a time. */
			lockKey?: string
	  }
	| {
			/** Reject the caller. */
			authorized: false
	  }

const authEventSchema = object({
	token: string(),
})

/** The event the rpc authorizer receives. */
export type AuthEvent = {
	/** The auth token the caller sent in the authentication header. */
	token: string
}

/** The contract the rpc authorizer returns. */
export type AuthResponse = RpcAuthResult

type AuthSchema = GenericSchema<InferInput<typeof authEventSchema>, AuthEvent>

export const auth = <H extends Handler<AuthSchema, RpcAuthResult | Promise<RpcAuthResult>>>(handle: H) => {
	return consumer(authEventSchema as AuthSchema, handle)
}
