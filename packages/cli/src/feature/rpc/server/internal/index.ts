import { Session } from '../auth'
import { UNKNOWN_FUNCTION_NAME } from '../error'
import { FunctionResult } from '../response'
import { allowedFunctions } from './allowed-functions'

type InternalFunction = (payload: unknown, auth: Session) => Promise<FunctionResult> | FunctionResult

const internalFunctions: Record<string, InternalFunction> = {
	allowedFunctions,
}

export const invokeInternalFunction = (
	name: string,
	payload: unknown,
	auth: Session
): Promise<FunctionResult> | FunctionResult => {
	const fn = internalFunctions[name]
	if (!fn) {
		return UNKNOWN_FUNCTION_NAME
	}

	return fn(payload, auth)
}
