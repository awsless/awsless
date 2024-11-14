import { paramCase } from 'change-case'
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
		.map(v => paramCase(v) || v)
		.join(opt.seperator ?? '--')
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
		.map(v => paramCase(v) || v)
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
