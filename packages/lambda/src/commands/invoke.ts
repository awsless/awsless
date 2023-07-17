
import { fromUtf8, toUtf8 } from '@aws-sdk/util-utf8-node'
import { InvokeCommand } from '@aws-sdk/client-lambda'
import { lambdaClient } from '../helpers/client'
import { isViewableErrorString, parseViewableErrorString, ViewableError } from '../errors/viewable'
import { ErrorResponse, Invoke, LambdaError, UnknownInvokeOptions } from './type'

const isErrorResponse = (response: unknown): response is ErrorResponse => {
	return (
		typeof response === 'object' &&
		response !== null &&
		typeof (response as ErrorResponse).errorMessage === 'string'
	)
}

/** Invoke lambda function */
export const invoke:Invoke = async ({
	client = lambdaClient(),
	name,
	qualifier,
	type = 'RequestResponse',
	payload,
	reflectViewableErrors = true
}: UnknownInvokeOptions): Promise<unknown> => {
	const command = new InvokeCommand({
		InvocationType: type,
		FunctionName: name,
		Payload: payload ? fromUtf8(JSON.stringify(payload)) : undefined,
		Qualifier: qualifier,
	})

	const result = await client.send(command)
	if (!result.Payload) {
		return undefined
	}

	const json = toUtf8(result.Payload)
	if (!json) {
		return undefined
	}

	const response = JSON.parse(json) as unknown

	if (isErrorResponse(response)) {
		let error: LambdaError

		if (isViewableErrorString(response.errorMessage)) {
			const errorData = parseViewableErrorString(response.errorMessage)
			if (reflectViewableErrors) {
				error = new ViewableError(errorData.type, errorData.message, errorData.data)
			} else {
				error = new Error(errorData.message)
			}
		} else {
			error = new Error(response.errorMessage)
		}

		error.name = response.errorType
		error.response = response
		error.metadata = {
			service: name
		}

		throw error
	}

	return response
}
