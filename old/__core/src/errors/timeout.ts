
import { Context } from 'aws-lambda'

export class TimeoutError extends Error {
	constructor(remainingTime:number) {
		super(`Lambda will timeout in ${remainingTime}ms`)
	}
}

export const createTimeout = (context:Context | undefined, callback:(error:TimeoutError) => void) => {
	if(!context) {
		return
	}

	const delay: number = context.getRemainingTimeInMillis() - 1000
	const id = setTimeout(() => {
		const remaining: number = context.getRemainingTimeInMillis()
		callback(new TimeoutError(remaining))
	}, delay)

	return id
}
