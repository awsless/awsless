import { Session } from '../auth'
import { FunctionResult } from '../response'

export const allowedFunctions = (_: unknown, auth: Session): FunctionResult => {
	return {
		ok: true,
		data: (auth.authorized === true && auth.allowedFunctions) ?? [],
	}
}
