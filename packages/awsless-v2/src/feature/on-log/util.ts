import { aws } from '@awsless/formation'
import { AppContext, StackContext } from '../../feature.js'
import { OnLogFilter } from './schema.js'

export const getGlobalOnLog = (ctx: StackContext | AppContext) => {
	return ctx.appConfig.defaults.onLog ? ctx.shared.get<aws.ARN>('on-log-consumer-arn') : undefined
}

export const formatFilterPattern = (filters: OnLogFilter[]) => {
	return `{${filters.map(filter => `$.level = "${filter.toUpperCase()}"`).join(' || ')}}`
}
