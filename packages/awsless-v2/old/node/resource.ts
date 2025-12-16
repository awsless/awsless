import { paramCase } from 'change-case'

export const APP = (process.env.APP || 'app') as 'app'
export const STACK = (process.env.STACK || 'stack') as 'stack'
export const STAGE = (process.env.STAGE || 'stage') as 'stage'

export function getLocalResourceName<N extends string>(name: N): `${typeof APP}-${typeof STACK}-${N}`
export function getLocalResourceName<N extends string, S extends string>(
	name: N,
	stack: S
): `${typeof APP}-${S}-${N}`
export function getLocalResourceName<N extends string, S extends string, R extends string>(
	name: N,
	stack: S,
	resource: R
): `${R}-${typeof APP}-${S}-${N}`
export function getLocalResourceName<
	N extends string,
	S extends string = typeof STACK,
	R extends string | undefined = undefined
>(name: N, stack: S = STACK as S, resource?: R) {
	return `${resource ? paramCase(resource) + '-' : ''}${APP}-${paramCase(stack)}-${paramCase(name)}`
}

export function getGlobalResourceName<N extends string>(name: N): `${typeof APP}-${N}`
export function getGlobalResourceName<N extends string, R extends string>(
	name: N,
	resource: R
): `${R}-${typeof APP}-${N}`
export function getGlobalResourceName<
	//
	N extends string,
	R extends string | undefined = undefined
>(name: N, resource?: R) {
	return `${resource ? paramCase(resource) + '-' : ''}${APP}-${paramCase(name)}`
}
