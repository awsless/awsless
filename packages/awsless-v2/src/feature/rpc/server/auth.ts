import { toSeconds } from '@awsless/duration'
import { invoke } from '@awsless/lambda'
import { WeakCache } from '@awsless/weak-cache'
import { addSeconds, isFuture } from 'date-fns'
import { AUTH } from './config'
import { parseAuthResponse } from './validate'

const cache = new WeakCache<
	string,
	{
		ttl: Date
		context?: Record<string, unknown>
	}
>()

export const authenticate = async (token?: string) => {
	// ------------------------------------------
	// Ignore when no custom auth lambda is set.

	if (!AUTH) {
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

	if (entry && isFuture(entry.ttl)) {
		return {
			authorized: true,
			context: entry.context,
		}
	}

	// ------------------------------------------
	// Invoke the custom auth lambda

	let response: unknown

	try {
		response = await invoke({
			name: AUTH,
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

	cache.set(token, {
		ttl,
		context,
	})

	return {
		authorized: true,
		context,
	}
}
