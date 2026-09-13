import { ExpectedError, ViewableError } from '@awsless/lambda'
import { GenericIssue } from '@awsless/validate'
import { FunctionError, GlobalError } from './response'

export const INVALID_REQUEST = (issues: GenericIssue[]): GlobalError => {
	return {
		type: 'invalid-request',
		message: `Invalid request payload: ${issues.at(0)?.message}`,
	}
}

export const UNAUTHORIZED = (reason?: string): GlobalError => ({
	type: 'unauthorized',
	message: reason ?? 'Unauthorized',
})

export const INTERNAL_SERVER_ERROR: GlobalError = {
	type: 'internal-server-error',
	message: 'Internal Server Error',
}

export const TOO_MANY_REQUESTS: GlobalError = {
	type: 'too-many-requests',
	message: 'Only one request can be processed at a time. Please try again shortly.',
}

export const ONE_FUNCTION_AT_A_TIME: GlobalError = {
	type: 'one-function-at-a-time',
	message: 'Only one locked function is allowed to be called at a time.',
}

export const NO_LOCK_KEY_PROVIDED: GlobalError = {
	type: 'no-lock-key-provided',
	message: 'Your trying to call a locked function without providing a `lockKey`.',
}

export const PERMISSION_ACCESS_DENIED: FunctionError = {
	ok: false,
	error: {
		type: 'permission-access-denied',
		message: `You do not have permissions to call this function.`,
	},
}

export const UNKNOWN_FUNCTION_NAME: FunctionError = {
	ok: false,
	error: {
		type: 'unknown-function-name',
		message: 'Unknown function name',
	},
}

export const INTERNAL_FUNCTION_ERROR: FunctionError = {
	ok: false,
	error: {
		type: 'internal-function-error',
		message: 'Oops, something went wrong!',
	},
}

export const UNKNOWN_ERROR: FunctionError = {
	ok: false,
	error: {
		type: 'unknown-error',
		message: 'Unknown error',
	},
}

export const EXPECTED_ERROR = (error: ViewableError | ExpectedError): FunctionError => ({
	ok: false,
	error: {
		type: error.type,
		message: error.message,
		data: error.data,
	},
})
