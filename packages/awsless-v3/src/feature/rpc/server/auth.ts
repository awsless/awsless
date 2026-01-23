import { toSeconds } from '@awsless/duration'
import { invoke } from '@awsless/lambda'
import { WeakCache } from '@awsless/weak-cache'
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

export const authenticate = async (token?: string) => {
	// ------------------------------------------
	// Ignore when no custom auth lambda is set.

	if (!process.env.AUTH) {
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

	const entry = cache.get(token)

	if (entry) {
		if (isFuture(entry.ttl)) {
			return {
				authorized: true,
				context: entry.context,
				lockKey: entry.lockKey,
				allowedFunctions: entry.allowedFunctions,
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
		}
	}

	// ------------------------------------------
	// Cache the authorized token response

	const now = new Date()
	const ttl = addSeconds(now, Number(toSeconds(result.output.ttl)))
	const context = result.output.context
	const allowedFunctions = result.output.allowedFunctions
	const lockKey = result.output.lockKey

	cache.set(token, {
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
