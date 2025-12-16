import { invoke, ViewableError } from '@awsless/lambda'
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { authenticate } from './auth.js'
import {
	EXPECTED_ERROR,
	INTERNAL_FUNCTION_ERROR,
	INTERNAL_SERVER_ERROR,
	INVALID_REQUEST,
	UNAUTHORIZED,
	UNKNOWN_ERROR,
	UNKNOWN_FUNCTION_NAME,
} from './error.js'
import { FunctionResult, response } from './response.js'
import { getFunctionName } from './schema.js'
import { parseRequest } from './validate.js'
import { buildViewerPayload } from './viewer.js'

export default async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
	try {
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
		// Execute request functions

		const result = await Promise.allSettled(
			request.output.body.map(async (fn): Promise<FunctionResult> => {
				const name = await getFunctionName(fn.name)

				if (!name) {
					return UNKNOWN_FUNCTION_NAME
				}

				let data: unknown
				try {
					data = await invoke({
						name,
						payload: {
							...(fn.payload ?? {}),
							...(auth.context ?? {}),
							// headers: request.output.headers,
							viewer: buildViewerPayload(request.output),
						},
					})
				} catch (error) {
					if (error instanceof ViewableError) {
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
		console.error('internal error', error)
		return response(500, INTERNAL_SERVER_ERROR)
	}
}
