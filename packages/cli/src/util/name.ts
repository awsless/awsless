import { kebabCase } from 'change-case'
import { createHmac } from 'crypto'

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

// The name of the shared bundle lambda that contains all handler code.
export const getBundleFunctionName = (appName: string) => {
	return formatGlobalResourceName({
		appName,
		resourceType: 'function',
		resourceName: 'bundle',
	})
}

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
