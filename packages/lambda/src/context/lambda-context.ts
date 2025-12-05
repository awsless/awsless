import { Context } from '../type'
import { GlobalContext } from './global-context'

export const eventContext = new GlobalContext<Context>()

export const getContext = () => {
	return eventContext.get()
}
