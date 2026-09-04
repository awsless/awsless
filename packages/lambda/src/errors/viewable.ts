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
