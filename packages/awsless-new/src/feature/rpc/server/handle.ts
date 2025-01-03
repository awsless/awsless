import { invoke, ViewableError } from '@awsless/lambda'
// import { WeakCache } from '@awsless/weak-cache'
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { authenticate } from './auth.js'
import { SCHEMA } from './config.js'
import {
	EXPECTED_ERROR,
	INTERNAL_FUNCTION_ERROR,
	INVALID_REQUEST,
	UNAUTHORIZED,
	UNKNOWN_ERROR,
	UNKNOWN_FUNCTION_NAME,
} from './error.js'
import { FunctionResult, response } from './response.js'
import { parseRequest } from './validate.js'
import { buildViewerPayload } from './viewer.js'

// const cache = new WeakCache<string, string>()

export default async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
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
	// Get schema items for every function

	// const schema: Record<string, string> = {}
	// const names = new Set(request.output.body.map(fn =>fn.name))
	// const schemas = await batchGetItem(schemaTable, names.map(name))

	// ----------------------------------------
	// Execute request functions

	const result = await Promise.allSettled(
		request.output.body.map(async (fn): Promise<FunctionResult> => {
			const name = SCHEMA[fn.name]

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
				console.error(error)

				if (error instanceof ViewableError) {
					return EXPECTED_ERROR(error)
				} else {
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
}
