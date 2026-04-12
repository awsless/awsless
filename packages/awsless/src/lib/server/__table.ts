import { define } from '@awsless/dynamodb'
import { constantCase } from 'change-case'
import { createProxy } from '../proxy.js'
import { bindLocalResourceName } from './util.js'

export const getTableName = bindLocalResourceName('table')

export interface TableResources {}

export const definedTables = []

export const Table: TableResources = /*@__PURE__*/ createProxy(stack => {
	return createProxy(name => {
		const tableName = getTableName(name, stack)
		const json = process.env[`TABLE_${constantCase(tableName)}`]

		if (!json) {
			throw new Error(`Table not defined: ${tableName}`)
		}

		const props = JSON.parse(json) as {
			hash: string
			sort?: string
			indexes?: Record<string, { hash: string; sort?: string }>
		}

		const fn = (schema: any) => {
			const table = define(tableName, {
				...props,
				schema,
			})

			definedTables.push(table)
			return table
		}

		fn.name = tableName

		return fn
	})
})
