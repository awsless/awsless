import { Context } from '../type'
import { GlobalContext } from './global-context'

export const eventContext = new GlobalContext<Context>()

export const getContext = () => {
	const ctx = eventContext.get()

	if (!ctx) {
		throw new Error('Lambda context is not available')
	}

	return ctx
}
