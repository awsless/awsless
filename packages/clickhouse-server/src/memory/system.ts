import { aggregateNames } from './aggregates'
import { Catalog, createTableQuery, engineText, partitionKey, primaryKey, sortingKey } from './catalog'
import { QueryContext } from './evaluate'
import { functionNames } from './functions'
import { sql } from './naming'
import { DataType, formatType, parseType } from './types'
import { DateTimeValue, Value } from './values'

type SystemTable = {
	columns: { name: string; type: DataType }[]
	rows: Value[][]
}

const columns = (spec: string) => {
	return spec.split(',').map(part => {
		const [name, ...type] = part.trim().split(' ')
		return { name: name!, type: parseType(type.join(' ')) }
	})
}

const SETTINGS: [string, Value, string][] = [
	['date_time_input_format', 'best_effort', 'String'],
	['date_time_output_format', 'simple', 'String'],
	['output_format_json_quote_64bit_integers', false, 'Bool'],
	['output_format_json_quote_denormals', false, 'Bool'],
	['output_format_json_escape_forward_slashes', true, 'Bool'],
	['input_format_skip_unknown_fields', true, 'Bool'],
	['join_use_nulls', false, 'Bool'],
	['async_insert', false, 'Bool'],
	['wait_for_async_insert', true, 'Bool'],
	['max_result_rows', 0, 'UInt64'],
	['max_threads', 0, 'UInt64'],
	['enable_positional_arguments', true, 'Bool'],
	['session_timezone', '', 'String'],
]

export const defaultSetting = (name: string) => SETTINGS.find(([setting]) => setting === name)?.[1]

export const systemTable = (name: string, catalog: Catalog, ctx: QueryContext): SystemTable | undefined => {
	const tables = catalog.tables()

	switch (name) {
		case 'one':
			return { columns: columns('dummy UInt8'), rows: [[0]] }
		case 'databases':
		case 'schemata':
			return {
				columns: columns(
					'name String, engine String, data_path String, metadata_path String, uuid UUID, comment String'
				),
				rows: [...catalog.databases.keys(), 'system'].map(database => [
					database,
					database === 'system' ? 'Memory' : 'Atomic',
					'',
					'',
					'00000000-0000-0000-0000-000000000000',
					'',
				]),
			}
		case 'tables':
			return {
				columns: columns(
					'database String, name String, uuid UUID, engine String, is_temporary UInt8, metadata_modification_time DateTime, create_table_query String, engine_full String, partition_key String, sorting_key String, primary_key String, sampling_key String, storage_policy String, total_rows Nullable(UInt64), total_bytes Nullable(UInt64), comment String'
				),
				rows: tables.map(table => [
					table.database,
					table.name,
					'00000000-0000-0000-0000-000000000000',
					table.engine.name,
					0,
					new DateTimeValue(Math.floor(table.modifiedAt / 1000) * 1000, 0),
					createTableQuery(table),
					engineText(table),
					partitionKey(table),
					sortingKey(table),
					primaryKey(table),
					'',
					'default',
					table.rows.length,
					0,
					table.comment,
				]),
			}
		case 'columns':
			return {
				columns: columns(
					'database String, table String, name String, type String, position UInt64, default_kind String, default_expression String, data_compressed_bytes UInt64, data_uncompressed_bytes UInt64, marks_bytes UInt64, comment String, is_in_partition_key UInt8, is_in_sorting_key UInt8, is_in_primary_key UInt8, is_in_sampling_key UInt8, compression_codec String'
				),
				rows: tables.flatMap(table => {
					const sorting = table.orderBy.map(expr => sql(expr))
					const primary = (table.primaryKey ?? table.orderBy).map(expr => sql(expr))
					const partition = table.partitionBy ? sql(table.partitionBy) : ''

					return table.columns.map((column, index) => [
						table.database,
						table.name,
						column.name,
						formatType(column.type),
						index + 1,
						column.defaultKind ?? '',
						column.defaultExpr ? sql(column.defaultExpr) : '',
						0,
						0,
						0,
						column.comment,
						partition.includes(column.name) ? 1 : 0,
						sorting.includes(column.name) ? 1 : 0,
						primary.includes(column.name) ? 1 : 0,
						0,
						column.codec ? `CODEC(${column.codec})` : '',
					])
				}),
			}
		case 'data_skipping_indices':
			return {
				columns: columns(
					'database String, table String, name String, type String, type_full String, expr String, granularity UInt64'
				),
				rows: tables.flatMap(table =>
					table.indexes.map(index => [
						table.database,
						table.name,
						index.name,
						index.type.replace(/\(.*$/, ''),
						index.type,
						sql(index.expr),
						index.granularity,
					])
				),
			}
		case 'parts':
			return {
				columns: columns(
					'database String, table String, name String, partition String, active UInt8, rows UInt64, bytes_on_disk UInt64, modification_time DateTime'
				),
				rows: tables
					.filter(table => table.rows.length > 0)
					.map(table => [
						table.database,
						table.name,
						'all_1_1_0',
						'tuple()',
						1,
						table.rows.length,
						0,
						new DateTimeValue(Math.floor(table.modifiedAt / 1000) * 1000, 0),
					]),
			}
		case 'mutations':
			return {
				columns: columns(
					'database String, table String, mutation_id String, command String, create_time DateTime, parts_to_do UInt64, is_done UInt8, latest_fail_reason String'
				),
				rows: catalog.mutations.map(mutation => [
					mutation.database,
					mutation.table,
					mutation.id,
					mutation.command,
					new DateTimeValue(Math.floor(mutation.createdAt / 1000) * 1000, 0),
					0,
					1,
					'',
				]),
			}
		case 'settings':
			return {
				columns: columns('name String, value String, changed UInt8, type String'),
				rows: SETTINGS.map(([setting, value, type]) => {
					const current = ctx.fn.settings[setting] ?? value
					return [setting, String(current), current === value ? 0 : 1, type]
				}),
			}
		case 'functions':
			return {
				columns: columns('name String, is_aggregate UInt8, case_insensitive UInt8'),
				rows: [...functionNames().map(fn => [fn, 0, 0]), ...aggregateNames().map(fn => [fn, 1, 0])],
			}
		case 'time_zones':
			return {
				columns: columns('time_zone String'),
				rows: Intl.supportedValuesOf('timeZone').map(zone => [zone]),
			}
		case 'build_options':
			return {
				columns: columns('name String, value String'),
				rows: [['VERSION_FULL', 'ClickHouse 26.8.33.10 (in-memory)']],
			}
		case 'processes':
		case 'replicas':
		case 'query_log':
		case 'errors':
			return { columns: columns('query_id String, query String'), rows: [] }
	}

	return undefined
}
