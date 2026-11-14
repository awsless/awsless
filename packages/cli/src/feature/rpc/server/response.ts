import { stringify } from '@awsless/json'

export type GlobalError = {
	type: string
	message: string
}

export type FunctionSuccess = {
	ok: true
	data: unknown
}

export type FunctionError = {
	ok: false
	error: {
		type: string
		message: string
		data?: unknown
	}
}

export type FunctionResult = FunctionSuccess | FunctionError

export const response = (status: number, results: GlobalError | FunctionResult[]) => {
	return new Response(stringify(results), { status, headers: { 'content-type': 'application/json' } })
}
