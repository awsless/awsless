import { getStackString, parseStack } from './stacktrace.js'

export function toException(error: Error)
{
	const stack = getStackString(error)

	return {
		errorClass: error.name,
		message: error.message,
		stacktrace: stack && parseStack(stack),
		type: 'nodejs'
	}
}
