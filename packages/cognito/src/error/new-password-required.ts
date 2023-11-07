export class NewPasswordRequired extends Error {
	constructor(
		readonly username: string,
		readonly session: string,
		readonly userAttributes: object,
		message = 'New password required'
	) {
		super(message)
	}
}
