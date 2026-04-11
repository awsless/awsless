import { Session } from '../auth'
import { FunctionResult } from '../response'

export const allowedFunctions = (_: unknown, auth: Session): FunctionResult => {
	return {
		ok: true,
		data: getAllowedFunctions(auth),
	}
}

const getAllowedFunctions = (auth: Session) => {
	if (!process.env.AUTH) {
		return ['*']
	}

	if (!auth.authorized) {
		return []
	}

	if (typeof auth.allowedFunctions === 'undefined') {
		return ['*']
	}

	return auth.allowedFunctions
}
