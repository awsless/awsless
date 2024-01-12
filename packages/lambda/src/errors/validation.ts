import { Issues, ValiError } from '@awsless/validate'
import { ViewableError } from './viewable.js'

export class ValidationError extends ViewableError {
	constructor(issues: Issues) {
		super('validation', 'Validation Error', {
			issues: issues.map(issue => ({
				// input: issue.input,
				path: issue.path,
				reason: issue.reason,
				origin: issue.origin,
				message: issue.message,
				validation: issue.validation,
			})),
		})
	}
}

export const transformValidationErrors = async <T>(callback: () => Promise<T> | T): Promise<T> => {
	try {
		return await callback()
	} catch (error) {
		if (error instanceof ValiError) {
			throw new ValidationError(error.issues)
		}

		throw error
	}
}
