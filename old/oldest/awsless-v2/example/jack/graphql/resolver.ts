import { Context, LambdaRequest, util } from '@aws-appsync/utils'

export function request(ctx: Context): LambdaRequest {
	return {
		operation: 'Invoke',
		payload: ctx.arguments,
	}
}

export function response(ctx: Context) {
	const { result, error } = ctx

	if (error) {
		util.error('Oops, something went wrong', 'InternalError')
	}

	return result
}
