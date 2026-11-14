import { unknownFormat } from './errors'
import { QueryResult } from './evaluate'
import { formatIso } from './time'
import { formatDateTimeValue, formatDateValue, formatNumber, formatType, textValue } from './types'
import { DateTimeValue, DateValue, IntervalValue, TupleValue, Value } from './values'

export type OutputSettings = {
	dateTimeFormat: 'simple' | 'iso' | 'unix_timestamp'
	quote64BitIntegers: boolean
	quoteDenormals: boolean
	escapeForwardSlashes: boolean
	serverTimeZone: string
}

export const outputSettings = (settings: Record<string, unknown>): OutputSettings => {
	const flag = (name: string, fallback: boolean) => {
		const value = settings[name]
		if (value === undefined) return fallback
		return value === true || value === 1 || value === '1' || value === 'true'
	}

	const format = String(settings.date_time_output_format ?? 'simple')

	return {
		dateTimeFormat: format === 'iso' || format === 'unix_timestamp' ? format : 'simple',
		quote64BitIntegers: flag('output_format_json_quote_64bit_integers', false),
		quoteDenormals: flag('output_format_json_quote_denormals', false),
		escapeForwardSlashes: flag('output_format_json_escape_forward_slashes', true),
		serverTimeZone: 'UTC',
	}
}

const jsonString = (value: string, settings: OutputSettings) => {
	const text = JSON.stringify(value)
	return settings.escapeForwardSlashes ? text.replaceAll('/', '\\/') : text
}

const dateTimeText = (value: DateTimeValue, settings: OutputSettings) => {
	if (settings.dateTimeFormat === 'iso') return formatIso(value.ms, value.scale)
	if (settings.dateTimeFormat === 'unix_timestamp')
		return value.scale > 0 ? (value.ms / 1000).toFixed(value.scale) : String(Math.floor(value.ms / 1000))

	return formatDateTimeValue(value, settings.serverTimeZone)
}

// A value as JSON text, written by hand so 64-bit integers keep every
// digit & slashes come out escaped like ClickHouse writes them.
export const jsonValue = (value: Value, settings: OutputSettings): string => {
	if (value === null) return 'null'
	if (typeof value === 'string') return jsonString(value, settings)
	if (typeof value === 'boolean') return value ? 'true' : 'false'

	if (typeof value === 'number') {
		if (!Number.isFinite(value)) return settings.quoteDenormals ? `"${formatNumber(value)}"` : 'null'
		return formatNumber(value)
	}

	if (typeof value === 'bigint') return settings.quote64BitIntegers ? `"${value}"` : value.toString()

	if (value instanceof DateTimeValue) {
		const text = dateTimeText(value, settings)
		return settings.dateTimeFormat === 'unix_timestamp' ? text : jsonString(text, settings)
	}

	if (value instanceof DateValue) return jsonString(formatDateValue(value), settings)
	if (value instanceof IntervalValue) return String(value.count)
	if (Array.isArray(value)) return `[${value.map(item => jsonValue(item, settings)).join(',')}]`

	if (value instanceof TupleValue) {
		if (value.names) {
			return `{${value.items.map((item, index) => `${jsonString(value.names![index]!, settings)}:${jsonValue(item, settings)}`).join(',')}}`
		}

		return `[${value.items.map(item => jsonValue(item, settings)).join(',')}]`
	}

	if (value instanceof Map) {
		return `{${[...value.entries()].map(([key, item]) => `${jsonString(textValue(key), settings)}:${jsonValue(item, settings)}`).join(',')}}`
	}

	return jsonObject(value as Record<string, unknown>, settings)
}

const jsonObject = (value: unknown, settings: OutputSettings): string => {
	if (value === null || typeof value !== 'object') return jsonValue(value as Value, settings)
	if (Array.isArray(value)) return `[${value.map(item => jsonObject(item, settings)).join(',')}]`

	return `{${Object.entries(value as Record<string, unknown>)
		.filter(([, item]) => item !== undefined)
		.map(([key, item]) => `${jsonString(key, settings)}:${jsonObject(item, settings)}`)
		.join(',')}}`
}

const tsvEscape = (text: string) => {
	return text
		.replaceAll('\\', '\\\\')
		.replaceAll('\t', '\\t')
		.replaceAll('\n', '\\n')
		.replaceAll('\r', '\\r')
		.replaceAll('\0', '\\0')
		.replaceAll('\b', '\\b')
		.replaceAll('\f', '\\f')
}

const tsvValue = (value: Value, settings: OutputSettings): string => {
	if (value === null) return '\\N'
	if (value instanceof DateTimeValue) return dateTimeText(value, settings)
	if (typeof value === 'string') return tsvEscape(value)
	if (
		value !== null &&
		typeof value === 'object' &&
		!(value instanceof DateValue) &&
		!Array.isArray(value) &&
		!(value instanceof TupleValue) &&
		!(value instanceof Map) &&
		!(value instanceof IntervalValue)
	) {
		return tsvEscape(jsonObject(value, settings))
	}

	return tsvEscape(textValue(value))
}

const csvValue = (value: Value, settings: OutputSettings): string => {
	if (value === null) return '\\N'
	if (typeof value === 'number' || typeof value === 'bigint') return textValue(value)
	if (typeof value === 'boolean') return value ? 'true' : 'false'

	const text =
		value instanceof DateTimeValue
			? dateTimeText(value, settings)
			: typeof value === 'string'
				? value
				: textValue(value)

	return `"${text.replaceAll('"', '""')}"`
}

export type Formatted = {
	body: string
	contentType: string
	format: string
}

const FORMAT_NAMES: Record<string, string> = {
	jsoneachrow: 'JSONEachRow',
	ndjson: 'JSONEachRow',
	jsonlines: 'JSONEachRow',
	jsonl: 'JSONEachRow',
	jsonstringseachrow: 'JSONStringsEachRow',
	jsoncompacteachrow: 'JSONCompactEachRow',
	jsoncompactstringseachrow: 'JSONCompactStringsEachRow',
	jsoncompacteachrowwithnames: 'JSONCompactEachRowWithNames',
	jsoncompacteachrowwithnamesandtypes: 'JSONCompactEachRowWithNamesAndTypes',
	jsonobjecteachrow: 'JSONObjectEachRow',
	json: 'JSON',
	jsonstrings: 'JSONStrings',
	jsoncompact: 'JSONCompact',
	jsoncompactstrings: 'JSONCompactStrings',
	tabseparated: 'TabSeparated',
	tsv: 'TabSeparated',
	tabseparatedraw: 'TabSeparatedRaw',
	tsvraw: 'TabSeparatedRaw',
	tabseparatedwithnames: 'TabSeparatedWithNames',
	tsvwithnames: 'TabSeparatedWithNames',
	tabseparatedwithnamesandtypes: 'TabSeparatedWithNamesAndTypes',
	tsvwithnamesandtypes: 'TabSeparatedWithNamesAndTypes',
	csv: 'CSV',
	csvwithnames: 'CSVWithNames',
	csvwithnamesandtypes: 'CSVWithNamesAndTypes',
	values: 'Values',
	null: 'Null',
}

export const normalizeFormat = (name: string) => {
	const format = FORMAT_NAMES[name.toLowerCase()]

	if (!format) {
		throw unknownFormat(`Unknown output format ${name}`)
	}

	return format
}

// 64-bit integer columns come out quoted when the setting asks for it.
const quoted = (result: QueryResult, settings: OutputSettings) => {
	return result.columns.map(
		column =>
			settings.quote64BitIntegers &&
			column.type !== undefined &&
			/^U?Int(64|128|256)$/.test(
				column.type.name === 'Nullable' || column.type.name === 'LowCardinality'
					? column.type.inner.name
					: column.type.name
			)
	)
}

const typeName = (result: QueryResult, index: number) => {
	const type = result.columns[index]!.type
	return type ? formatType(type) : 'String'
}

export const formatResult = (result: QueryResult, name: string, settings: OutputSettings, elapsed = 0): Formatted => {
	const format = normalizeFormat(name)
	const names = result.columns.map(column => column.name)
	const lines = (rows: string[]) => rows.map(row => `${row}\n`).join('')
	const quote = quoted(result, settings)
	const cellJson = (value: Value, index: number) =>
		quote[index] && (typeof value === 'number' || typeof value === 'bigint')
			? `"${value}"`
			: jsonValue(value, settings)
	const asString = (value: Value) =>
		value === null
			? 'null'
			: jsonString(
					value instanceof DateTimeValue
						? dateTimeText(value, settings)
						: typeof value === 'string'
							? value
							: textValue(value),
					settings
				)

	switch (format) {
		case 'JSONEachRow':
			return {
				format,
				contentType: 'application/x-ndjson; charset=UTF-8',
				body: lines(
					result.rows.map(
						row =>
							`{${row.map((value, index) => `${jsonString(names[index]!, settings)}:${cellJson(value, index)}`).join(',')}}`
					)
				),
			}
		case 'JSONStringsEachRow':
			return {
				format,
				contentType: 'application/x-ndjson; charset=UTF-8',
				body: lines(
					result.rows.map(
						row =>
							`{${row.map((value, index) => `${jsonString(names[index]!, settings)}:${asString(value)}`).join(',')}}`
					)
				),
			}
		case 'JSONCompactEachRow':
		case 'JSONCompactStringsEachRow':
		case 'JSONCompactEachRowWithNames':
		case 'JSONCompactEachRowWithNamesAndTypes': {
			const strings = format === 'JSONCompactStringsEachRow'
			const header: string[] = []
			if (format !== 'JSONCompactEachRow' && format !== 'JSONCompactStringsEachRow')
				header.push(`[${names.map(name => jsonString(name, settings)).join(', ')}]`)
			if (format === 'JSONCompactEachRowWithNamesAndTypes')
				header.push(`[${names.map((_, index) => jsonString(typeName(result, index), settings)).join(', ')}]`)
			return {
				format,
				contentType: 'application/x-ndjson; charset=UTF-8',
				body: lines([
					...header,
					...result.rows.map(
						row =>
							`[${row.map((value, index) => (strings ? asString(value) : cellJson(value, index))).join(', ')}]`
					),
				]),
			}
		}
		case 'JSONObjectEachRow':
			return {
				format,
				contentType: 'application/json; charset=UTF-8',
				body: `{${result.rows.map((row, index) => `${jsonString(`row_${index + 1}`, settings)}:{${row.map((value, column) => `${jsonString(names[column]!, settings)}:${jsonValue(value, settings)}`).join(',')}}`).join(',')}}\n`,
			}
		case 'JSON':
		case 'JSONStrings':
		case 'JSONCompact':
		case 'JSONCompactStrings': {
			const compact = format === 'JSONCompact' || format === 'JSONCompactStrings'
			const strings = format === 'JSONStrings' || format === 'JSONCompactStrings'
			const cell = (value: Value, index: number) => (strings ? asString(value) : cellJson(value, index))
			const meta = names
				.map(
					(name, index) =>
						`\t\t{\n\t\t\t"name": ${jsonString(name, settings)},\n\t\t\t"type": ${jsonString(typeName(result, index), settings)}\n\t\t}`
				)
				.join(',\n')
			const data = result.rows
				.map(row =>
					compact
						? `\t\t[${row.map(cell).join(', ')}]`
						: `\t\t{\n${row.map((value, index) => `\t\t\t${jsonString(names[index]!, settings)}: ${cell(value, index)}`).join(',\n')}\n\t\t}`
				)
				.join(',\n')

			return {
				format,
				contentType: 'application/json; charset=UTF-8',
				body: `{\n\t"meta":\n\t[\n${meta}\n\t],\n\n\t"data":\n\t[\n${data}\n\t],\n\n\t"rows": ${result.rows.length},\n\n\t"statistics":\n\t{\n\t\t"elapsed": ${elapsed},\n\t\t"rows_read": ${result.rows.length},\n\t\t"bytes_read": 0\n\t}\n}\n`,
			}
		}
		case 'TabSeparated':
		case 'TabSeparatedRaw':
		case 'TabSeparatedWithNames':
		case 'TabSeparatedWithNamesAndTypes': {
			const raw = format === 'TabSeparatedRaw'
			const header: string[] = []
			if (format === 'TabSeparatedWithNames' || format === 'TabSeparatedWithNamesAndTypes')
				header.push(names.map(tsvEscape).join('\t'))
			if (format === 'TabSeparatedWithNamesAndTypes')
				header.push(names.map((_, index) => typeName(result, index)).join('\t'))
			return {
				format,
				contentType: 'text/tab-separated-values; charset=UTF-8',
				body: lines([
					...header,
					...result.rows.map(row =>
						row
							.map(value => (raw && typeof value === 'string' ? value : tsvValue(value, settings)))
							.join('\t')
					),
				]),
			}
		}
		case 'CSV':
		case 'CSVWithNames':
		case 'CSVWithNamesAndTypes': {
			const header: string[] = []
			if (format !== 'CSV') header.push(names.map(name => `"${name.replaceAll('"', '""')}"`).join(','))
			if (format === 'CSVWithNamesAndTypes')
				header.push(names.map((_, index) => `"${typeName(result, index)}"`).join(','))
			return {
				format,
				contentType: 'text/csv; charset=UTF-8; header=present',
				body: lines([
					...header,
					...result.rows.map(row => row.map(value => csvValue(value, settings)).join(',')),
				]),
			}
		}
		case 'Values':
			return {
				format,
				contentType: 'text/plain; charset=UTF-8',
				body: result.rows.map(row => `(${row.map(value => textValue(value, true)).join(',')})`).join(','),
			}
		case 'Null':
			return { format, contentType: 'text/plain; charset=UTF-8', body: '' }
	}

	throw unknownFormat(`Unknown output format ${name}`)
}
