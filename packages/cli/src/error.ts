import { ZodError } from 'zod'

// The prompt library throws its own Cancelled, so the cli shares it.
export { Cancelled } from '@awsless/clui'

export class ExpectedError extends Error {}

export class ConfigError extends Error {
	constructor(
		readonly file: string,
		readonly error: ZodError,
		readonly data: any
	) {
		super(error.message)
	}
}

export class FileError extends Error {
	constructor(
		readonly file: string,
		message: string
	) {
		super(message)
	}
}
