import { paramCase } from 'change-case'

export const APP = (process.env.APP ?? 'app') as 'app'
export const STACK = (process.env.STACK ?? 'stack') as 'stack'
// export const STAGE = (process.env.STAGE ?? 'stage') as 'stage'

export const bindLocalResourceName = <T extends string>(type: T) => {
	return <N extends string, S extends string = typeof STACK>(name: N, stack: S = STACK as S) => {
		return [APP, paramCase(stack), paramCase(type), paramCase(name)].join(
			'--'
		) as `${typeof APP}--${S}--${T}--${N}`
	}
}

export const bindGlobalResourceName = <T extends string>(type: T) => {
	return <N extends string>(name: N) => {
		return [APP, paramCase(type), paramCase(name)].join('--') as `${typeof APP}--${T}--${N}`
	}
}

/*@__NO_SIDE_EFFECTS__*/
export const createProxy = (cb: (name: string) => unknown) => {
	const cache = new Map<string, unknown>()

	return new Proxy(
		{},
		{
			get(_, name: string) {
				if (!cache.has(name)) {
					cache.set(name, cb(name))
				}

				return cache.get(name)
			},
		}
	)
}
