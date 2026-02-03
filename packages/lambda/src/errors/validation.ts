import { GenericIssue, ValiError } from '@awsless/validate'
import { ViewableError } from './viewable.js'

export class ValidationError extends ViewableError {
	constructor(message: string, issues: GenericIssue[]) {
		super('validation', message, {
			issues: issues.map(issue => ({
				path: issue.path?.map(path => ({
					key: path.key,
					type: path.type,
				})),
				// reason: issue.reason,
				message: issue.message,
				received: issue.received,
				expected: issue.expected,
			})),
		})
	}
}

export const transformValidationErrors = async <T>(callback: () => Promise<T> | T): Promise<T> => {
	try {
		return await callback()
	} catch (error) {
		if (error instanceof ValiError) {
			throw new ValidationError(error.message, error.issues)
		}

		throw error
	}
}
