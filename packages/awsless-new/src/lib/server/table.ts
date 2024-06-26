import { createProxy } from '../proxy.js'
import { bindLocalResourceName } from './util.js'

export const getTableName = bindLocalResourceName('table')

export interface TableResources {}

export const Table: TableResources = /*@__PURE__*/ createProxy(stack => {
	return createProxy(name => {
		return getTableName(name, stack)
	})
})
