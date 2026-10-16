export class ExpectedError extends Error {
	constructor(
		readonly type: string,
		message: string,
		// Structured details that survive the error response.
		readonly data?: unknown
	) {
		super(message)
	}
}
