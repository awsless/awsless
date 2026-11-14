import { AnyObjectSchema, clickhouseClient, ClickHouseClient, define } from '@awsless/clickhouse'
import { ssm } from '@awsless/ssm'
import { trace } from '@awsless/utils'
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

// How long one query or insert may wait, in milliseconds: long enough for an
// idle service to wake (a service of two replicas took over two minutes),
// short of the lambda's own timeout.
const CLICKHOUSE_REQUEST_TIMEOUT = 300_000

// A span per query, command and insert, named by the operation and table
// alone: the sql and the rows stay out of the trace.
const traceClient = (raw: ClickHouseClient): ClickHouseClient => ({
	...raw,
	query: <T = Record<string, unknown>>(...args: Parameters<ClickHouseClient['query']>) =>
		trace('ClickHouse', () => raw.query<T>(...args), {
			namespace: 'remote',
			annotations: { clickhouse_operation: 'query' },
		}),
	command: (...args) =>
		trace('ClickHouse', () => raw.command(...args), {
			namespace: 'remote',
			annotations: { clickhouse_operation: 'command' },
		}),
	insert: (table, rows, options) =>
		trace('ClickHouse', () => raw.insert(table, rows, options), {
			namespace: 'remote',
			annotations: { clickhouse_operation: 'insert' },
			metadata: { table, rows: rows.length },
		}),
})

// One client per lambda. A deployed app reads the generated password from
// ssm on the first query; locally the default user has none.
const getClient = () => {
	if (!client) {
		const parameter = process.env.CLICKHOUSE_PASSWORD_PARAMETER

		client = traceClient(
			clickhouseClient({
				endpoint: process.env.CLICKHOUSE_ENDPOINT!,
				password: parameter ? async () => (await ssm({ password: parameter })).password : undefined,
				// A ClickHouse Cloud service that idled out takes minutes to wake,
				// past the client's own 30 second default.
				requestTimeout: CLICKHOUSE_REQUEST_TIMEOUT,
				// Progress headers every 10 seconds keep a long query's connection
				// alive past a load balancer's idle timeout.
				settings: { send_progress_in_http_headers: 1, http_headers_progress_interval_ms: '10000' },
			})
		)
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
