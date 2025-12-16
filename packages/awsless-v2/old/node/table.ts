import { getLocalResourceName } from './resource.js'
import { createProxy } from './util.js'

export const getTableName = getLocalResourceName

export interface TableResources {}

export const Table: TableResources = /*@__PURE__*/ createProxy(stack => {
	return createProxy(name => {
		return getTableName(name, stack)
	})
})
