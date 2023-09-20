import { getLocalResourceName } from "./resource"
import { createProxy } from "./util"

export const getStoreName = getLocalResourceName

export interface StoreResources {}

export const Store:StoreResources = createProxy((stack) => {
	return createProxy((name) => {
		return {
			name: getStoreName(name, stack)
		}
	})
})
