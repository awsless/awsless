import { ValiError } from '@awsless/validate'
import { ExpectedError } from './expected.js'

export class ValidationError extends ExpectedError {
	constructor(message: string) {
		super('validation', message)
	}
}

export const transformValidationErrors = async <T>(callback: () => Promise<T> | T): Promise<T> => {
	try {
		return await callback()
	} catch (error) {
		if (error instanceof ValiError) {
			throw new ValidationError(error.message)
		}

		throw error
	}
}
