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
			// The data rides along, so a caller keeps the structured details.
			data: error.data,
		},
	}
}
