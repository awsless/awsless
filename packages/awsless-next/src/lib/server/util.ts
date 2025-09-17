import { kebabCase } from 'change-case'

export const APP = (process.env.APP ?? 'app') as 'app'
export const STACK = (process.env.STACK ?? 'stack') as 'stack'
export const IS_TEST = process.env.NODE_ENV === 'test'

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

const build = (opt: {
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
	return <N extends string, S extends string = typeof STACK>(resourceName: N, stackName: S = STACK as S) => {
		return build({
			stackName,
			resourceName,
			resourceType,
			postfix,
		}) as `${typeof APP}--${S}--${T}--${N}--${P}`
	}
}

export const bindLocalResourceName = <T extends string>(resourceType: T) => {
	return <N extends string, S extends string = typeof STACK>(resourceName: N, stackName: S = STACK as S) => {
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
