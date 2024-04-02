export function request(ctx) {
	return {
		operation: 'Invoke',
		payload: ctx.arguments,
	}
}

export function response(ctx) {
	const { result, error } = ctx

	if (error) {
		util.error('Oops, something went wrong', 'InternalError')
	}

	return result
}
