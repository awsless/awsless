import { ExpectedError, invoke, ViewableError } from '@awsless/lambda'
import { APIGatewayProxyEventV2 } from 'aws-lambda'
import { randomUUID } from 'node:crypto'
import { authenticate } from './auth.js'
import {
	EXPECTED_ERROR,
	INTERNAL_FUNCTION_ERROR,
	INTERNAL_SERVER_ERROR,
	INVALID_REQUEST,
	ONE_FUNCTION_AT_A_TIME,
	PERMISSION_ACCESS_DENIED,
	TOO_MANY_REQUESTS,
	UNAUTHORIZED,
	UNKNOWN_ERROR,
	UNKNOWN_FUNCTION_NAME,
} from './error.js'
import { invokeInternalFunction } from './internal/index.js'
import { lock, unlock } from './lock.js'
import { FunctionResult, Response, response } from './response.js'
import { getFunctionDetails } from './schema.js'
import { parseRequest } from './validate.js'
import { buildViewerPayload } from './viewer.js'

export default async (event: APIGatewayProxyEventV2): Promise<Response> => {
	try {
		// ----------------------------------------
		// Generate a request ID

		const requestId = randomUUID()

		// ----------------------------------------
		// Validate request

		const request = parseRequest(event)

		if (!request.success) {
			return response(400, INVALID_REQUEST(request.issues))
		}

		// ----------------------------------------
		// Authenticate request

		const auth = await authenticate(request.output.headers.authentication)

		if (!auth.authorized) {
			return response(405, UNAUTHORIZED(auth.reason))
		}

		// ----------------------------------------
		// Log Request in cloudwatch for user monitoring purposes.

		console.log({
			requestId,
			lockKey: auth.lockKey,
			authContext: auth.context,
			request: request.output.body,
			ip: request.output.requestContext.http.sourceIp,
		})

		// ----------------------------------------
		// Lock the request if needed

		if (auth.lockKey) {
			// We should not allow batch calls for locked requests.
			if (request.output.body.length !== 1) {
				return response(400, ONE_FUNCTION_AT_A_TIME)
			}

			const locked = await lock(requestId, auth.lockKey)

			if (!locked) {
				return response(429, TOO_MANY_REQUESTS)
			}
		}

		// ----------------------------------------
		// Execute request functions

		const result = await Promise.allSettled(
			request.output.body.map(async (fn): Promise<FunctionResult> => {
				// ----------------------------------------
				// Check if the function is internal

				if (fn.name.startsWith('$')) {
					return invokeInternalFunction(fn.name.slice(1), fn.payload, auth)
				}

				// ----------------------------------------
				// Get function details

				const fnName = await getFunctionDetails(fn.name)

				if (!fnName) {
					return UNKNOWN_FUNCTION_NAME
				}

				// ----------------------------------------
				// Check allowed fn permissions

				if (
					Array.isArray(auth.allowedFunctions) &&
					!auth.allowedFunctions.includes(fn.name) &&
					!auth.allowedFunctions.includes('*')
				) {
					return PERMISSION_ACCESS_DENIED
				}

				// ----------------------------------------
				// Invoke function

				let data: unknown
				try {
					data = await invoke({
						name: fnName,
						payload: {
							...(fn.payload ?? {}),
							...(auth.context ?? {}),
							// headers: request.output.headers,
							viewer: buildViewerPayload(request.output),
						},
					})
				} catch (error) {
					if (error instanceof ViewableError || error instanceof ExpectedError) {
						return EXPECTED_ERROR(error)
					} else {
						console.error(error)

						return INTERNAL_FUNCTION_ERROR
					}
				}

				return {
					ok: true,
					data,
				}
			})
		)

		// ----------------------------------------
		// Unlock the request if needed

		if (auth.lockKey) {
			await unlock(requestId, auth.lockKey)
		}

		// ----------------------------------------
		// Format proper response

		return response(
			200,
			result.map((item): FunctionResult => {
				if (item.status === 'fulfilled') {
					return item.value
				}

				return UNKNOWN_ERROR
			})
		)
	} catch (error) {
		console.log('internal error')
		console.error(error)

		return response(500, INTERNAL_SERVER_ERROR)
	}
}
