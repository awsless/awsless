import { define, GenericMapSchema } from '@awsless/dynamodb'
import { constantCase } from 'change-case'
import { createProxy } from '../proxy.js'
import { bindLocalResourceName, getStack } from './util.js'

export const getTableName = bindLocalResourceName('table')

type TableKeys = {
	hash: string
	sort?: string
	indexes?: Record<string, { hash: string | string[]; sort?: string | string[] }>
}

export const getTableProps = (name: string, stack: string = getStack()) => {
	const raw = process.env[`TABLE_${constantCase(stack)}_${constantCase(name)}_KEYS`]

	return {
		name: getTableName(name, stack),
		keys: raw ? (JSON.parse(raw) as TableKeys) : undefined,
	} as const
}

export interface TableResources {}

// The table keys & indexes live in the stack config - app code only
// supplies the runtime schema:
//
//   export const tasks = Table.todo.tasks.define(object({ ... }))
export const Table: TableResources = /*@__PURE__*/ createProxy(stack => {
	return createProxy(name => {
		return {
			name: getTableName(name, stack),
			define(schema: GenericMapSchema) {
				const { name: tableName, keys } = getTableProps(name, stack)

				if (!keys) {
					throw new Error(
						`No table key config found for "${stack}.${name}". Is the table defined in your stack file?`
					)
				}

				// The runtime values come from the stack config, while
				// the generated per table types carry the literals.
				return define(tableName, {
					hash: keys.hash,
					sort: keys.sort,
					indexes: keys.indexes,
					schema,
				} as never)
			},
		}
	})
})
