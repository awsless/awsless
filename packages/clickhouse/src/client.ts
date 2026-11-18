import { BaseQueryParams, ClickHouseLogLevel, ClickHouseSettings, createClient } from '@clickhouse/client'
import { quoteIdentifier } from './param'

export { ClickHouseError } from '@clickhouse/client'

export type Settings = ClickHouseSettings
export type QueryParams = NonNullable<BaseQueryParams['query_params']>

export type ClickHouseClientProps = {
	// The http interface, like https://abc.eu-west-1.aws.clickhouse.cloud:8443
	endpoint: string
	username?: string
	// A function when the password has to be fetched first, like from ssm.
	password?: string | (() => Promise<string>)
	database?: string
	settings?: Settings
	requestTimeout?: number
	// Leaves failed requests to the caller instead of the client's own
	// error log, for callers that retry them.
	silent?: boolean
}

export type InsertOptions = {
	// The server batches small inserts itself, the way many lambdas
	// writing a few rows each should insert. The call still waits until
	// the rows are written.
	async?: boolean
	settings?: Settings
}

// Results come back as JSON objects with plain numbers for 64-bit
// integers & ISO strings for dates.
const QUERY_SETTINGS: Settings = {
	output_format_json_quote_64bit_integers: 0,
	date_time_output_format: 'iso',
}

// For the query builder: every digit of a big integer & a decimal, which
// travel as text. The JSON format names the type of every column.
const TYPED_QUERY_SETTINGS: Settings = {
	output_format_json_quote_64bit_integers: 1,
	output_format_json_quote_decimals: 1,
	date_time_output_format: 'iso',
}

export type TypedRows = {
	columns: { name: string; type: string }[]
	rows: Record<string, unknown>[]
}

const INSERT_SETTINGS: Settings = {
	date_time_input_format: 'best_effort',
}

export type ClickHouseClient = ReturnType<typeof clickhouseClient>

// The official client behind the calls the ops & the query builder need. It's created
// on first use, once the password is known. Values always go in as
// {name:Type} parameters.
export const clickhouseClient = (props: ClickHouseClientProps) => {
	let client: Promise<ReturnType<typeof createClient>> | undefined

	const getClient = () => {
		client ??= (async () => {
			return createClient({
				url: props.endpoint,
				username: props.username ?? 'default',
				password: typeof props.password === 'function' ? await props.password() : (props.password ?? ''),
				database: props.database,
				clickhouse_settings: props.settings,
				request_timeout: props.requestTimeout,
				log: props.silent ? { level: ClickHouseLogLevel.OFF } : undefined,
			})
		})().catch(error => {
			client = undefined
			throw error
		})

		return client
	}

	return {
		// Rows as objects. Placeholders like {projectId:String} take their
		// values from params.
		async query<T = Record<string, unknown>>(sql: string, params?: QueryParams, settings?: Settings): Promise<T[]> {
			const result = await (
				await getClient()
			).query({
				query: sql,
				format: 'JSONEachRow',
				query_params: params,
				clickhouse_settings: { ...QUERY_SETTINGS, ...settings },
			})

			return result.json<T>()
		},

		// Rows as the server sent them, next to the type of every column.
		async queryTyped(sql: string, params?: QueryParams, settings?: Settings): Promise<TypedRows> {
			const result = await (
				await getClient()
			).query({
				query: sql,
				format: 'JSON',
				query_params: params,
				clickhouse_settings: { ...TYPED_QUERY_SETTINGS, ...settings },
			})

			const { meta, data } = await result.json<Record<string, unknown>>()

			return { columns: meta ?? [], rows: data }
		},

		// Statements without a result, like ddl.
		async command(sql: string, params?: QueryParams, settings?: Settings) {
			await (
				await getClient()
			).command({
				query: sql,
				query_params: params,
				clickhouse_settings: settings,
			})
		},

		// A table by its name, or by its database and name.
		async insert<T extends Record<string, unknown>>(
			table: string | [database: string, table: string],
			rows: T[],
			options: InsertOptions = {}
		) {
			if (rows.length === 0) {
				return
			}

			await (
				await getClient()
			).insert({
				// The official client writes the table name into the sql as is.
				table: [table].flat().map(quoteIdentifier).join('.'),
				values: rows,
				format: 'JSONEachRow',
				clickhouse_settings: {
					...INSERT_SETTINGS,
					...(options.async ? { async_insert: 1, wait_for_async_insert: 1 } : {}),
					...options.settings,
				},
			})
		},

		async close() {
			const current = client
			client = undefined
			await (await current)?.close()
		},
	}
}
