export type ErrorResponse = {
	__error__: {
		type: string
		// name: string
		message: string
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

export const toErrorResponse = (error: Error & { type: string }): ErrorResponse => {
	return {
		__error__: {
			type: error.type,
			// name: error.name,
			message: error.message,
		},
	}
}
