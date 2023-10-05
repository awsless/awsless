
import { paramCase } from "change-case"

export const APP = (process.env.APP || 'app') as 'app'
export const STACK = (process.env.STACK || 'stack') as 'stack'
export const STAGE = (process.env.STAGE || 'stage') as 'stage'

export const getLocalResourceName = <N extends string, S extends string = typeof STACK>(name: N, stack:S = (STACK as S)) => {
	return `${APP}-${paramCase(stack) as S}-${paramCase(name) as N}` as const
}

export const getGlobalResourceName = <N extends string>(name: N) => {
	return `${APP}-${paramCase(name) as N}` as const
}
