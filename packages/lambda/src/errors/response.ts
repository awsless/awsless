import { unpatch } from '@awsless/json'

export type ErrorResponse = {
	__error__: {
		type: string
		message: string
		data?: unknown
	}
}

export const isErrorResponse = (response: unknown): response is ErrorResponse => {
	return (
		typeof response === 'object' &&
		response !== null &&
		'__error__' in response &&
		typeof response.__error__ === 'object'
	)
}

export const toErrorResponse = (error: Error & { type: string; data?: unknown }): ErrorResponse => {
	return {
		__error__: {
			type: error.type,
			message: error.message,
			// Unpatched like a success result, so bigints and dates survive the
			// runtime's plain JSON.stringify and the invoker can parse them back.
			data: unpatch(error.data),
		},
	}
}
