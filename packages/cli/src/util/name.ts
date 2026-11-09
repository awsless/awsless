import { createHmac } from 'crypto'
import { kebabCase } from 'change-case'

export const formatGlobalResourceName = (opt: {
	appName: string
	resourceType: string
	resourceName: string
	seperator?: string
	prefix?: string
	postfix?: string
}) => {
	return [
		//
		opt.prefix,
		opt.appName,
		opt.resourceType,
		opt.resourceName,
		opt.postfix,
	]
		.filter(v => typeof v === 'string')
		.map(v => kebabCase(v) || v)
		.join(opt.seperator ?? '--')
}

// Every resource name of an app starts with this prefix.
export const getAppNamePrefix = (appName: string) => {
	return `${kebabCase(appName)}--`
}

// The bundle's Lambda function: invokes, queues, streams, crons and the
// routes that need its layers.
export const getEventFunctionName = (appName: string) => {
	return formatGlobalResourceName({
		appName,
		resourceType: 'bundle',
		resourceName: 'event',
	})
}

// The bundle's Lambda Web Function: the routers' bundle routes over HTTP.
export const getWebFunctionName = (appName: string) => {
	return formatGlobalResourceName({
		appName,
		resourceType: 'bundle',
		resourceName: 'web',
	})
}

// The web function's one endpoint, which every router calls.
export const WEB_FUNCTION_ENDPOINT_NAME = 'router'

export const formatLocalResourceName = (opt: {
	appName: string
	stackName: string
	resourceType: string
	resourceName: string
	seperator?: string
	prefix?: string
	postfix?: string
}) => {
	return [
		//
		opt.prefix,
		opt.appName,
		opt.stackName,
		opt.resourceType,
		opt.resourceName,
		opt.postfix,
	]
		.filter(v => typeof v === 'string')
		.map(v => kebabCase(v) || v)
		.join(opt.seperator ?? '--')
}

export const generateGlobalAppId = (opt: { accountId: string; region: string; appName: string }) => {
	return createHmac('sha1', 'awsless')
		.update(opt.accountId)
		.update(opt.region)
		.update(opt.appName)
		.digest('hex')
		.substring(0, 8)
}
