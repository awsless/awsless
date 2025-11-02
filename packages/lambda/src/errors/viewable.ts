// const prefix = '[viewable]'

export class ViewableError extends Error {
	readonly name = 'ViewableError'

	constructor(
		readonly type: string,
		message: string,
		readonly data?: unknown
	) {
		super(message)
	}
}

// export type ViewableErrorResponse = {
// 	__error__: {
// 		type: string
// 		message: string
// 		data?: unknown
// 	}
// }

// export const isViewableErrorType = (error: unknown, type: string): boolean => {
// 	return isViewableError(error) && getViewableErrorData(error).type === type
// }

// export const isViewableErrorResponse = (response: unknown): response is ViewableErrorResponse => {
// 	return (
// 		typeof response === 'object' &&
// 		response !== null &&
// 		'__error__' in response &&
// 		typeof response.__error__ === 'object'
// 	)
// }

// export const toViewableErrorResponse = (error: ViewableError): ViewableErrorResponse => {
// 	return {
// 		__error__: {
// 			type: error.type,
// 			data: error.data,
// 			message: error.message,
// 		},
// 	}
// }

// export const isViewableErrorString = (value: string): boolean => {
// 	return 0 === value.indexOf(prefix)
// }

// export const parseViewableErrorString = (value: string): ViewableErrorData => {
// 	const json = value.substring(prefix.length)
// 	const data = JSON.parse(json) as ViewableErrorData

// 	if (typeof data.type !== 'string' || typeof data.message !== 'string') {
// 		throw new TypeError('Invalid viewable error string')
// 	}

// 	return data
// }

// export const getViewableErrorData = (error: ViewableError): ViewableErrorData => {
// 	return parseViewableErrorString(error.message)
// }
