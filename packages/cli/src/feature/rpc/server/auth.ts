import { toSeconds } from '@awsless/duration'
import { WeakCache } from '@awsless/weak-cache'
import { getRouteEnv, internalInvoke } from 'awsless'
import { addSeconds, isFuture } from 'date-fns'
import { parseAuthResponse } from './validate'

const cache = new WeakCache<
	string,
	{
		ttl: Date
		context?: Record<string, unknown>
		allowedFunctions?: string[]
		lockKey?: string
	}
>()

export type Session =
	| {
			authorized: true
			context?: Record<string, unknown>
			allowedFunctions?: string[]
			lockKey?: string
	  }
	| {
			authorized: false
			reason: string
	  }

export const authenticate = async (token?: string): Promise<Session> => {
	// ------------------------------------------
	// Ignore when no custom auth lambda is set.

	const authRoute = getRouteEnv('AUTH')

	if (!authRoute) {
		return {
			authorized: true,
			context: {},
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

	const cacheKey = `${authRoute}:${token}`
	const entry = cache.get(cacheKey)

	if (entry) {
		if (isFuture(entry.ttl)) {
			return {
				authorized: true,
				context: entry.context,
				lockKey: entry.lockKey,
				allowedFunctions: entry.allowedFunctions,
			}
		} else {
			cache.delete(cacheKey)
		}
	}

	// ------------------------------------------
	// Call the custom auth handler in-process

	let response: unknown

	try {
		response = await internalInvoke(authRoute, { token })
	} catch (error) {
		console.error(error)

		return {
			authorized: false,
			reason: 'Invoke auth handle error',
		}
	}

	// ------------------------------------------
	// Parse & validate the response

	const result = parseAuthResponse(response)

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
	const allowedFunctions = result.output.allowedFunctions
	const lockKey = result.output.lockKey

	cache.set(cacheKey, {
		ttl,
		context,
		lockKey,
		allowedFunctions,
	})

	return {
		authorized: true,
		context,
		lockKey,
		allowedFunctions,
	}
}
