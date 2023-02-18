const prefix = '[viewable]'

export class ViewableError extends Error {
	readonly name = 'ViewableError'

	constructor(type: string, message: string, data?: unknown) {
		super(
			`${prefix} ${JSON.stringify({
				type,
				message,
				data
			})}`
		)
	}
}

interface ViewableErrorData {
	type: string
	message: string
	data?: unknown
}

export const isViewableError = (error: unknown): error is ViewableError => {
	return (
		error instanceof ViewableError || ( error instanceof Error && isViewableErrorString(error.message) )
	)
}

export const isViewableErrorString = (value: string): boolean => {
	return 0 === value.indexOf(prefix)
}

export const parseViewableErrorString = (value: string): ViewableErrorData => {
	const json = value.substring(prefix.length)
	const data = JSON.parse(json) as ViewableErrorData

	if(typeof data.type !== 'string' || typeof data.message !== 'string') {
		throw new TypeError('Invalid viewable error string')
	}

	return data
}

export const getViewableErrorData = (error: ViewableError): ViewableErrorData => {
	return parseViewableErrorString(error.message)
}
