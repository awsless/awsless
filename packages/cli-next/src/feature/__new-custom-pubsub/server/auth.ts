import { toSeconds } from '@awsless/duration'
import { invoke } from '@awsless/lambda'
import {
	array,
	duration,
	literal,
	object,
	optional,
	record,
	safeParse,
	string,
	union,
	unknown,
} from '@awsless/validate'
import { WeakCache } from '@awsless/weak-cache'
import { addSeconds, isFuture } from 'date-fns'

const authResponseSchema = union([
	object({
		authorized: literal(true),
		allowed: array(string()),
		context: optional(record(string(), unknown())),
		ttl: duration(),
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
	}
>()

export type Session =
	| {
			authorized: true
			context?: Record<string, unknown>
			allowed: string[]
	  }
	| {
			authorized: false
			reason: string
	  }

export const authenticate = async (token?: string | null): Promise<Session> => {
	return {
		authorized: true,
		context: { playerId: 1 },
		allowed: ['topic', 'player', 'other'],
	}

	// ------------------------------------------
	// Ignore when no custom auth lambda is set.

	if (!process.env.AUTH) {
		return {
			authorized: false,
			reason: 'No authorizer configured',
		}
	}

	// ------------------------------------------
	// Fail when no auth token is found.

	if (!token) {
		return {
			authorized: false,
			reason: 'No authentication token provided',
		}
	}

	// ------------------------------------------
	// Return cached response

	const entry = cache.get(token)

	if (entry) {
		if (isFuture(entry.ttl)) {
			return {
				authorized: true,
				context: entry.context,
				allowed: entry.allowed,
			}
		} else {
			cache.delete(token)
		}
	}

	// ------------------------------------------
	// Invoke the custom auth lambda

	let response: unknown

	try {
		response = await invoke({
			name: process.env.AUTH,
			payload: { token },
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
	const ttl = addSeconds(now, Number(toSeconds(result.output.ttl)))
	const context = result.output.context
	const allowed = result.output.allowed

	cache.set(token, {
		ttl,
		context,
		allowed,
	})

	return {
		authorized: true,
		context,
		allowed,
	}
}
