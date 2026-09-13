import { define, GenericMapSchema } from '@awsless/dynamodb'
import { constantCase } from 'change-case'
import { createProxy } from '../proxy.js'
import { bindLocalResourceName, getStack, isTest } from './util.js'

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

// A drifted schema fails loud instead of writing items missing their key attributes.
export const assertKeyAttributes = (label: string, keys: TableKeys, schema: GenericMapSchema) => {
	const attributes = [
		keys.hash,
		keys.sort,
		...Object.values(keys.indexes ?? {}).flatMap(index => [index.hash, index.sort]),
	]
		.flat()
		.filter(attribute => typeof attribute === 'string')

	for (const attribute of attributes) {
		if (!schema.walk?.(attribute)) {
			throw new Error(
				`The schema of table "${label}" is missing the "${attribute}" key field declared in the stack file.`
			)
		}
	}
}

export interface TableResources {}

// The keys & indexes live in the stack config, app code only supplies the schema.
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

				if (isTest()) {
					assertKeyAttributes(`${stack}.${name}`, keys, schema)
				}

				// The generated per table types carry the literal key names.
				return define(tableName, {
					hash: keys.hash,
					sort: keys.sort,
					indexes: keys.indexes,
					schema,
				})
			},
		}
	})
})
