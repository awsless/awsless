import { getLocalResourceName } from './resource.js'
import { createProxy } from './util.js'

export const getStoreName = getLocalResourceName

export interface StoreResources {}

export const Store:StoreResources = /*@__PURE__*/ createProxy((stack) => {
	return createProxy((name) => {
		return {
			name: getStoreName(name, stack)
		}
	})
})
