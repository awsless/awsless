import { getLocalResourceName } from "./resource"
import { createProxy } from "./util"

export const getSearchName = getLocalResourceName

export interface SearchResources {}

export const Search:SearchResources = createProxy((stack) => {
	return createProxy((name) => {
		return {
			name: getSearchName(name, stack)
		}
	})
})
