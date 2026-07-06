import { ZodError } from 'zod'

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

export class Cancelled extends Error {
	constructor() {
		super('Cancelled')
	}
}
