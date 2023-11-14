export const normalizeError = (maybeError: unknown): Error => {
	if (maybeError instanceof Error) {
		return maybeError
	}

	switch (typeof maybeError) {
		case 'string':
		case 'number':
		case 'boolean':
			return new Error(String(maybeError))
		case 'object':
			return new Error(JSON.stringify(maybeError))
	}

	const error = new Error('Received a non-error.')
	error.name = 'InvalidError'
	return error
}
