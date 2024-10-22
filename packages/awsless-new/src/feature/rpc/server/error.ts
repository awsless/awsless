import { ViewableError } from '@awsless/lambda'
import { FunctionError, GlobalError } from './response'

export const INVALID_REQUEST: GlobalError = {
	type: 'invalid-request',
	message: 'Invalid request payload',
}

export const UNAUTHORIZED: GlobalError = {
	type: 'unauthorized',
	message: 'Unauthorized',
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

export const EXPECTED_ERROR = (error: ViewableError): FunctionError => ({
	ok: false,
	error: {
		type: error.type,
		message: error.message,
		data: error.data,
	},
})
