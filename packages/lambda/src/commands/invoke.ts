import { InvokeCommand } from '@aws-sdk/client-lambda'
import { fromUtf8, toUtf8 } from '@aws-sdk/util-utf8-node'
import { parse, stringify } from '@awsless/json'
import { ExpectedError } from '../errors/expected'
import { isErrorResponse } from '../errors/response'
// import { isViewableErrorResponse, ViewableError } from '../errors/viewable'
import { lambdaClient } from '../helpers/client'
import { ErrorResponse, Invoke, LambdaError, UnknownInvokeOptions } from './type'

const isLambdaErrorResponse = (response: unknown): response is ErrorResponse => {
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
		Payload: payload ? fromUtf8(stringify(payload)) : undefined,
		Qualifier: qualifier,
	})

	const result = await client.send(command)
	if (!result.Payload) {
		return
	}

	const json = toUtf8(result.Payload)
	if (!json) {
		return
	}

	const response = parse(json)

	if (isErrorResponse(response)) {
		const e = response.__error__

		if (reflectViewableErrors) {
			throw new ExpectedError(e.message)
		} else {
			throw new Error(e.message)
		}

		// const error: LambdaError = reflectViewableErrors ? new ExpectedError(e.message) : new Error(e.message)

		// error.metadata = {
		// 	functionName: name,
		// }

		// throw error
	}

	if (isLambdaErrorResponse(response)) {
		const error: LambdaError = new Error(response.errorMessage)
		error.name = response.errorType

		// error.metadata = {
		// 	functionName: name,
		// }

		throw error
	}

	return response
}
