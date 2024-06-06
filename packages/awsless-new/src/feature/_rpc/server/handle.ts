import { invoke, ViewableError } from '@awsless/lambda'
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { isAuthorized } from './auth.js'
import { config } from './config.js'
import { parseBody } from './validate.js'

type FunctionSuccess = {
	ok: true
	data: unknown
}

type FunctionError = {
	ok: false
	error: {
		type: string
		message: string
		data?: unknown
	}
}

type FunctionResult = FunctionSuccess | FunctionError

const headers = {
	'content-type': 'application/json',
}

export default async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
	// ----------------------------------------
	// validate request

	const request = parseBody(event.body)

	if (!request.success) {
		return {
			headers,
			statusCode: 400,
			body: JSON.stringify({
				error: {
					type: 'invalid-request',
					message: 'Invalid request payload',
				},
			}),
		}
	}

	// ----------------------------------------
	// check auth

	// We can authenticate the user and store
	// it in a weak cache for future auth checks.

	if (config.auth) {
		const allowed = await isAuthorized(event)
		if (!allowed) {
			return {
				headers,
				statusCode: 405,
				body: JSON.stringify({
					error: {
						type: 'unauthorized',
						message: 'Unauthorized',
					},
				}),
			}
		}
	}

	// ----------------------------------------
	// Execute request functions

	const result = await Promise.allSettled(
		request.output.map(async (request): Promise<FunctionResult> => {
			const name = config.functions[request.name]
			if (!name) {
				return {
					ok: false,
					error: {
						type: 'invalid-function-name',
						message: 'Invalid function name provided',
					},
				}
			}

			let data
			try {
				data = await invoke({
					name,
					payload: {
						...request.payload,
						userAgent: event.requestContext.http.userAgent,
						ip: event.requestContext.http.sourceIp,
					},
				})
			} catch (error) {
				if (error instanceof ViewableError) {
					return {
						ok: false,
						error: {
							type: error.type,
							message: error.message,
							data: error.data,
						},
					}
				} else {
					return {
						ok: false,
						error: {
							type: 'internal-function-error',
							message: 'Oops something went wrong!',
						},
					}
				}
			}

			return {
				ok: true,
				data: data,
			}
		})
	)

	return {
		headers,
		statusCode: 200,
		body: JSON.stringify(
			result.map((item): FunctionResult => {
				if (item.status === 'fulfilled') {
					return item.value
				}

				return {
					ok: false,
					error: {
						type: 'unknown-error',
						message: 'Unknown error',
					},
				}
			})
		),
	}
}
