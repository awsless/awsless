import { getLocalResourceName } from "./resource"
import { createProxy } from "./util"

export const getTableName = getLocalResourceName

export interface TableResources {}

export const Table:TableResources = createProxy((stack) => {
	return createProxy((name) => {
		return {
			name: getTableName(name, stack)
		}
	})
})
