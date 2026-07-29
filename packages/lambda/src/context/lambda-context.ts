import { Context } from '../type'
import { AsyncContext } from './async-context'

export const eventContext = new AsyncContext<Context>()

export const getContext = () => {
	const ctx = eventContext.get()

	if (!ctx) {
		throw new Error('Lambda context is not available')
	}

	return ctx
}
