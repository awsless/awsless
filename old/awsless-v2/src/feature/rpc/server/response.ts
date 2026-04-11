import { stringify } from '@awsless/json'
import { APIGatewayProxyResultV2 } from 'aws-lambda'

export type GlobalError = {
	type: string
	message: string
}

export type FunctionSuccess = {
	ok: true
	data: unknown
}

export type FunctionError = {
	ok: false
	error: {
		type: string
		message: string
		data?: unknown
	}
}

export type FunctionResult = FunctionSuccess | FunctionError

export const response = (statusCode: number, results: GlobalError | FunctionResult[]): APIGatewayProxyResultV2 => {
	return {
		headers: {
			'content-type': 'application/json',
		},
		statusCode,
		body: stringify(results),
	}
}
