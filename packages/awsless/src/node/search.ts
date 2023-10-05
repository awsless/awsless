import { getLocalResourceName } from './resource.js'
import { createProxy } from './util.js'

export const getSearchName = getLocalResourceName

export interface SearchResources {}

export const Search:SearchResources = createProxy((stack) => {
	return createProxy((name) => {
		return {
			name: getSearchName(name, stack)
		}
	})
})
