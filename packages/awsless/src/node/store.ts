import { getLocalResourceName } from './resource.js'
import { createProxy } from './util.js'

export const getStoreName = getLocalResourceName

export interface StoreResources {}

export const Store:StoreResources = createProxy((stack) => {
	return createProxy((name) => {
		return {
			name: getStoreName(name, stack)
		}
	})
})
