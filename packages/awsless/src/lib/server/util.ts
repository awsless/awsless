import { isTestEnv } from '@awsless/lambda'
import { kebabCase } from 'change-case'
import { getCurrentRoute } from './bundle.js'

// Read lazily: the CLI `run` command imports this module before it
// knows the app config & sets the env vars afterwards.
export const getApp = () => process.env.APP!
export const getAppId = () => process.env.APP_ID!
export const getRegion = () => process.env.AWS_REGION!
export const getAccountId = () => process.env.AWS_ACCOUNT_ID!

// A function, so it tracks the env like the lambda wrapper does.
export const isTest = () => isTestEnv()

// Local dev is a third mode: tests bypass bundle routing to keep
// name-keyed mocks working, local dev keeps the production paths.
export const IS_LOCAL = process.env.AWSLESS_ENV === 'local'

// One bundle process hosts every stack, so the active stack is only
// known while a route runs; stand-alone lambdas carry it in the env.
export const getRoute = () => getCurrentRoute()
export const getStack = () => getRoute()?.split(':')[0] ?? process.env.STACK!

// Must produce the same names as the CLI's formatGlobalResourceName &
// formatLocalResourceName, including keeping a part kebab-case can't touch.
export const formatResourceName = (opt: {
	prefix?: string
	stackName?: string
	resourceType: string
	resourceName: string
	postfix?: string
	separator?: string
}) => {
	return [opt.prefix, getApp(), opt.stackName, opt.resourceType, opt.resourceName, opt.postfix]
		.filter(v => typeof v === 'string')
		.map(v => kebabCase(v) || v)
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
		}) as `${string}--${S}--${T}--${N}`
	}
}

export const bindGlobalResourceName = <T extends string>(resourceType: T) => {
	return <N extends string>(resourceName: N) => {
		return formatResourceName({
			resourceType,
			resourceName,
		}) as `${string}--${T}--${N}`
	}
}
