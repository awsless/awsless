import { AnyObjectSchema, clickhouseClient, ClickHouseClient, define } from '@awsless/clickhouse'
import { ssm } from '@awsless/ssm'
import { kebabCase } from 'change-case'
import { createProxy } from '../proxy.js'
import { getApp, getStack, isTest } from './util.js'

// The physical table name inside the app's ClickHouse service, also used
// by the CLI.
export const getClickHouseTableName = (stackName: string, tableName: string) => {
	return `${kebabCase(stackName)}--${tableName}`
}

export const getClickHouseProps = (name: string, stack: string = getStack()) => {
	const table = getClickHouseTableName(stack, name)

	return {
		endpoint: process.env.CLICKHOUSE_ENDPOINT,
		// Every test file shares one ClickHouse server, so the per-file app
		// prefix keeps their tables apart.
		name: isTest() ? `${kebabCase(getApp())}--${table}` : table,
	} as const
}

let client: ClickHouseClient | undefined

// One client per lambda. A deployed app reads the generated password from
// ssm on the first query; locally the default user has none.
const getClient = () => {
	if (!client) {
		const parameter = process.env.CLICKHOUSE_PASSWORD_PARAMETER

		client = clickhouseClient({
			endpoint: process.env.CLICKHOUSE_ENDPOINT!,
			password: parameter ? async () => (await ssm({ password: parameter })).password : undefined,
		})
	}

	return client
}

// A drifted schema fails loud in the tests, instead of an insert failing
// on the deployed table.
export const assertMatchingColumns = (
	label: string,
	declared: Record<string, string>,
	defined: Record<string, string>
) => {
	for (const column of Object.keys(defined)) {
		if (!declared[column]) {
			throw new Error(
				`The schema of ClickHouse table "${label}" defines the column "${column}", which the stack file doesn't declare.`
			)
		}
	}

	for (const [column, type] of Object.entries(declared)) {
		const definedType = defined[column]

		if (!definedType) {
			throw new Error(
				`The stack file declares the column "${column}" for ClickHouse table "${label}", which the code schema doesn't define.`
			)
		}

		if (definedType.replaceAll(' ', '') !== type.replaceAll(' ', '')) {
			throw new Error(
				`The column "${column}" of ClickHouse table "${label}" is a "${definedType}" in the code schema but a "${type}" in the stack file.`
			)
		}
	}
}

export interface ClickHouseResources {}

export const ClickHouse: ClickHouseResources = /*@__PURE__*/ createProxy(stack => {
	return createProxy(name => {
		const { endpoint, name: table } = getClickHouseProps(name, stack)

		return {
			name: table,
			endpoint,
			define(schema: AnyObjectSchema) {
				if (isTest()) {
					const declared = process.env[`CLICKHOUSE_COLUMNS_${table}`]

					if (declared) {
						assertMatchingColumns(`${stack}.${name}`, JSON.parse(declared), schema.columns)
					}
				}

				return define(table, schema, getClient)
			},
		}
	})
})
