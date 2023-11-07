export class ResponseError extends Error {
	constructor(message: string, readonly code: string) {
		super(message)
	}
}
