import { AppContext, StackContext } from '../../feature.js'
import { OnLogFilter } from './schema.js'

export const getGlobalOnLog = (ctx: StackContext | AppContext) => {
	if (ctx.appConfig.defaults.onLog && ctx.shared.has('on-log', 'consumer-arn')) {
		return ctx.shared.get('on-log', 'consumer-arn')
	}

	return
}

export const formatFilterPattern = (filters: OnLogFilter[]) => {
	return `{${filters.map(filter => `$.level = "${filter.toUpperCase()}"`).join(' || ')}}`
}
