
import { Failure, StructError } from '@heat/validate'
import { ViewableError } from './viewable.js'

export class ValidationError extends ViewableError {
	constructor(failures:Failure[]) {
		super('validation', 'Validation Error', {
			failures: failures.map(failure => ({
				key: failure.key as string,
				path: failure.path,
				type: failure.type,
				message: failure.message,
			}))
		})
	}
}

export const transformValidationErrors = async <T>(callback:() => Promise<T> | T): Promise<T> => {
	try {
		return await callback()
	}
	catch(error) {
		if(error instanceof StructError) {
			throw new ValidationError(error.failures())
		}

		throw error
	}
}
