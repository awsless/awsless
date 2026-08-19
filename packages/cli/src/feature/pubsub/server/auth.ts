import { days, Duration, hours, toSeconds, weeks } from '@awsless/duration'
import { invoke } from '@awsless/lambda'
import {
	array,
	duration,
	literal,
	maxDuration,
	minDuration,
	object,
	optional,
	pipe,
	record,
	safeParse,
	string,
	union,
	unknown,
} from '@awsless/validate'
import { WeakCache } from '@awsless/weak-cache'
import { formatRoutePayload } from 'awsless'
import { addSeconds, isFuture } from 'date-fns'

const authResponseSchema = union([
	object({
		authorized: literal(true),
		allowed: array(string()),
		context: optional(record(string(), unknown())),
		ttl: optional(duration(), hours(1)),
		disconnectAfter: optional(pipe(duration(), minDuration(hours(1)), maxDuration(weeks(1))), days(1)),
	}),

	object({
		authorized: literal(false),
	}),
])

const cache = new WeakCache<
	string,
	{
		ttl: Date
		context?: Record<string, unknown>
		allowed: string[]
		disconnectAfter: Duration
	}
>()

export type Session =
	| {
			authorized: true
			context?: Record<string, unknown>
			allowed: string[]
			disconnectAfter: Duration
	  }
	| {
			authorized: false
			reason: string
	  }

export const authenticate = async (token?: string | null): Promise<Session> => {
	// ------------------------------------------
	// Ignore when no custom auth lambda is set.

	if (!process.env.AUTH) {
		return {
			authorized: false,
			reason: 'No authorizer configured',
		}
	}

	// ------------------------------------------
	// Guests don't provide an auth token.
	// The auth lambda decides what they are allowed to do,
	// and all guests share a single cached response.

	const cacheKey = token ?? ''

	// ------------------------------------------
	// Return cached response

	const entry = cache.get(cacheKey)

	if (entry) {
		if (isFuture(entry.ttl)) {
			return {
				authorized: true,
				context: entry.context,
				allowed: entry.allowed,
				disconnectAfter: entry.disconnectAfter,
			}
		} else {
			cache.delete(cacheKey)
		}
	}

	// ------------------------------------------
	// Invoke the auth handler inside the app bundle

	let response: unknown

	try {
		response = await invoke({
			name: process.env.AUTH,
			payload: formatRoutePayload(process.env.AUTH_ROUTE!, { token: token ?? undefined }),
		})
	} catch (error) {
		console.error(error)

		return {
			authorized: false,
			reason: 'Invoke auth handle error',
		}
	}

	// ------------------------------------------
	// Parse & validate the response

	const result = safeParse(authResponseSchema, response)

	if (!result.success) {
		return {
			authorized: false,
			reason: 'Invalid auth handle response',
		}
	}

	// ------------------------------------------
	// Check if the token was authorized

	if (!result.output.authorized) {
		return {
			authorized: false,
			reason: 'Invalid auth token',
		}
	}

	// ------------------------------------------
	// Cache the authorized token response

	const now = new Date()
	const ttl = addSeconds(now, toSeconds(result.output.ttl))
	const context = result.output.context
	const allowed = result.output.allowed
	const disconnectAfter = result.output.disconnectAfter

	cache.set(cacheKey, {
		ttl,
		context,
		allowed,
		disconnectAfter,
	})

	return {
		authorized: true,
		context,
		allowed,
		disconnectAfter,
	}
}
