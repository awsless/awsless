import { isTestEnv } from '@awsless/lambda'
import { kebabCase } from 'change-case'
import { getCurrentRoute } from './bundle.js'

// The app env is read lazily: the CLI `run` command imports this
// module before it knows the app config & sets the env vars afterwards.
export const getApp = () => process.env.APP!
export const getAppId = () => process.env.APP_ID!
export const getRegion = () => process.env.AWS_REGION!
export const getAccountId = () => process.env.AWS_ACCOUNT_ID!

export const IS_TEST = isTestEnv()
// Local dev mode (`awsless dev`) is a third mode, separate from IS_TEST:
// tests bypass bundle routing to keep name-keyed mocks working, while local
// dev keeps the production code paths and redirects the AWS boundary instead.
export const IS_LOCAL = process.env.AWSLESS_ENV === 'local'

// One bundled lambda process hosts every stack, so the active route
// is only known while a request is being handled, not at startup.
export const getRoute = () => getCurrentRoute() ?? process.env.AWSLESS_ROUTE
export const getStack = () => getRoute()?.split(':')[0] ?? process.env.STACK!

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
		getApp(),
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
