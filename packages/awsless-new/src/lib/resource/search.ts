import { constantCase } from 'change-case'
import { STACK, bindLocalResourceName, createProxy } from './util.js'

export const getSearchName = bindLocalResourceName('search')

export const getSearchProps = (name: string, stack: string = STACK) => {
	const prefix = `CACHE_${constantCase(stack)}_${constantCase(name)}`

	return {
		name: getSearchName(name, stack),
		domain: process.env[`${prefix}_DOMAIN`],
	} as const
}

export interface SearchResources {}

export const Search: SearchResources = /*@__PURE__*/ createProxy(stack => {
	return createProxy(name => {
		return getSearchProps(name, stack)
	})
})
