export class ExpectedError extends Error {
	constructor(
		readonly type: string,
		message: string,
		// Structured details that survive the error response, like a
		// viewable error's data.
		readonly data?: unknown
	) {
		super(message)
	}
}
