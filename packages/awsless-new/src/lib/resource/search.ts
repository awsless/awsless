import { bindLocalResourceName, createProxy } from './util.js'

export const getSearchName = bindLocalResourceName('search')

export interface SearchResources {}

export const Search: SearchResources = /*@__PURE__*/ createProxy(stack => {
	return createProxy(name => {
		return {
			name: getSearchName(name, stack),
		}
	})
})
