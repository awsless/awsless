import { kebabCase } from 'change-case'
import { getCurrentRoute } from './context.js'

export const APP = (process.env.APP ?? 'app') as 'app'
export const APP_ID = (process.env.APP_ID ?? 'app-id') as 'app-id'

// Inside the bundle the stack is scoped to the running route,
// so we need to read it live instead of at module load.
export const getStack = () => ((getCurrentRoute() ?? process.env.AWSLESS_ROUTE)?.split(':')[0] ?? 'stack') as 'stack'
export const IS_TEST = process.env.NODE_ENV === 'test'
export const REGION = process.env.AWS_REGION
export const ACCOUNT_ID = process.env.AWS_ACCOUNT_ID

// const bindResourceName = (
// 	resourceType: string,
// 	opts?: {
// 		prefix?: string
// 		postfix?: string
// 	}
// ) => {
// 	return (resourceName: string, stackName?: string) => {
// 		return [
// 			opts?.prefix,
// 			APP,
// 			stackName && kebabCase(stackName),
// 			kebabCase(resourceType),
// 			kebabCase(resourceName),
// 			opts?.postfix,
// 		].join('--')
// 	}
// }

export const build = (opt: {
	prefix?: string
	stackName?: string
	resourceType: string
	resourceName: string
	postfix?: string
	seperator?: string
}) => {
	return [
		//
		opt?.prefix,
		APP,
		opt.stackName,
		opt.resourceType,
		opt.resourceName,
		opt?.postfix,
	]
		.filter(v => typeof v === 'string')
		.map(v => kebabCase(v))
		.join(opt.seperator ?? '--')
}

export const bindPostfixedLocalResourceName = <T extends string, P extends string>(resourceType: T, postfix: P) => {
	return <N extends string, S extends string = ReturnType<typeof getStack>>(
		resourceName: N,
		stackName: S = getStack() as S
	) => {
		return build({
			stackName,
			resourceName,
			resourceType,
			postfix,
		}) as `${typeof APP}--${S}--${T}--${N}--${P}`
	}
}

export const bindLocalResourceName = <T extends string>(resourceType: T) => {
	return <N extends string, S extends string = ReturnType<typeof getStack>>(
		resourceName: N,
		stackName: S = getStack() as S
	) => {
		return build({
			stackName,
			resourceType,
			resourceName,
		}) as `${typeof APP}--${S}--${T}--${N}`
	}
}

export const bindGlobalResourceName = <T extends string>(resourceType: T) => {
	return <N extends string>(resourceName: N) => {
		return build({
			resourceType,
			resourceName,
		}) as `${typeof APP}--${T}--${N}`
	}
}
