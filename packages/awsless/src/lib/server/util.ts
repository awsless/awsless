import { kebabCase } from 'change-case'
import { getCurrentRoute } from './bundle.js'

export const APP = process.env.APP!
export const APP_ID = process.env.APP_ID!
export const IS_TEST = process.env.NODE_ENV === 'test'
export const REGION = process.env.AWS_REGION!
export const ACCOUNT_ID = process.env.AWS_ACCOUNT_ID!
export const STACK = process.env.STACK!

// One bundled lambda process hosts every stack, so the active route
// is only known while a request is being handled, not at startup.
export const getStack = () => (getCurrentRoute() ?? process.env.AWSLESS_ROUTE)?.split(':')[0] ?? STACK

export const formatResourceName = (opt: {
	prefix?: string
	stackName?: string
	resourceType: string
	resourceName: string
	postfix?: string
	separator?: string
}) => {
	return [
		//
		opt.prefix,
		APP,
		opt.stackName,
		opt.resourceType,
		opt.resourceName,
		opt.postfix,
	]
		.filter(v => typeof v === 'string')
		.map(v => kebabCase(v))
		.join(opt.separator ?? '--')
}

export const bindLocalResourceName = <T extends string>(resourceType: T) => {
	return <N extends string, S extends string = ReturnType<typeof getStack>>(
		resourceName: N,
		stackName: S = getStack() as S
	) => {
		return formatResourceName({
			stackName,
			resourceType,
			resourceName,
		}) as `${typeof APP}--${S}--${T}--${N}`
	}
}

export const bindGlobalResourceName = <T extends string>(resourceType: T) => {
	return <N extends string>(resourceName: N) => {
		return formatResourceName({
			resourceType,
			resourceName,
		}) as `${typeof APP}--${T}--${N}`
	}
}
