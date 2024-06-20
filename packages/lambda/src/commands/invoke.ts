import { InvokeCommand } from '@aws-sdk/client-lambda'
import { fromUtf8, toUtf8 } from '@aws-sdk/util-utf8-node'
import { isViewableErrorResponse, ViewableError } from '../errors/viewable'
import { lambdaClient } from '../helpers/client'
import { ErrorResponse, Invoke, LambdaError, UnknownInvokeOptions } from './type'

const isErrorResponse = (response: unknown): response is ErrorResponse => {
	return (
		typeof response === 'object' &&
		response !== null &&
		typeof (response as ErrorResponse).errorMessage === 'string'
	)
}

/** Invoke lambda function */
export const invoke: Invoke = async ({
	client = lambdaClient(),
	name,
	qualifier,
	type = 'RequestResponse',
	payload,
	reflectViewableErrors = true,
}: UnknownInvokeOptions) => {
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

	if (isViewableErrorResponse(response)) {
		const e = response.__error__
		const error: LambdaError = reflectViewableErrors
			? new ViewableError(e.type, e.message, e.data)
			: new Error(e.message)

		error.metadata = {
			functionName: name,
		}

		throw error
	}

	if (isErrorResponse(response)) {
		const error: LambdaError = new Error(response.errorMessage)
		error.name = response.errorType

		error.metadata = {
			functionName: name,
		}

		throw error
	}

	return response
}
