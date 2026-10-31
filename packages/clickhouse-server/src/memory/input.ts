import { cannotParseText, unknownFormat } from './errors'
import { normalizeFormat } from './format'
import { parseJsonSequence } from './json'
import { parseLiteralText, unescape } from './types'
import { Value } from './values'

// A parsed input row: raw JSON values for JSON formats, text for TSV & CSV,
// engine values for Values.
export type InputRow =
	| { kind: 'json'; values: Record<string, unknown> }
	| { kind: 'text'; values: Record<string, string | null> }
	| { kind: 'value'; values: Record<string, Value> }

// Rows as JSON values one after the other; one array around them all is
// fine too for the formats that take objects.
const jsonRows = (data: string, objects: boolean) => {
	const values = parseJsonSequence(data)

	if (objects && values.length === 1 && Array.isArray(values[0])) {
		return values[0] as unknown[]
	}

	return values
}

const splitLines = (data: string) =>
	data
		.split('\n')
		.filter((line, index, lines) => line !== '' || index < lines.length - 1)
		.filter(line => line !== '')

const tsvField = (text: string): string | null => (text === '\\N' ? null : unescape(text))

const csvRows = (data: string): (string | null)[][] => {
	const rows: (string | null)[][] = []
	let row: (string | null)[] = []
	let field = ''
	let quoted = false
	let wasQuoted = false

	for (let i = 0; i < data.length; i++) {
		const char = data[i]!

		if (quoted) {
			if (char === '"' && data[i + 1] === '"') {
				field += '"'
				i++
			} else if (char === '"') {
				quoted = false
			} else {
				field += char
			}
			continue
		}

		if (char === '"' && field === '') {
			quoted = true
			wasQuoted = true
		} else if (char === ',') {
			row.push(!wasQuoted && field === '\\N' ? null : field)
			field = ''
			wasQuoted = false
		} else if (char === '\n' || char === '\r') {
			if (char === '\r' && data[i + 1] === '\n') i++
			row.push(!wasQuoted && field === '\\N' ? null : field)
			rows.push(row)
			row = []
			field = ''
			wasQuoted = false
		} else {
			field += char
		}
	}

	if (field !== '' || row.length > 0) {
		row.push(!wasQuoted && field === '\\N' ? null : field)
		rows.push(row)
	}

	return rows
}

const zip = <T>(names: string[], values: T[]) => Object.fromEntries(names.map((name, index) => [name, values[index]!]))

export const parseInput = (data: string, format: string, columns: string[]): InputRow[] => {
	const name = normalizeFormat(format)

	switch (name) {
		case 'JSONEachRow':
		case 'JSONStringsEachRow':
			return jsonRows(data, true).map(item => {
				if (item === null || typeof item !== 'object' || Array.isArray(item)) {
					throw cannotParseText(
						`Cannot parse input: expected '{' before: ${JSON.stringify(item).slice(0, 40)}`
					)
				}

				return { kind: 'json', values: item as Record<string, unknown> }
			})
		case 'JSONCompactEachRow':
		case 'JSONCompactStringsEachRow':
		case 'JSONCompactEachRowWithNames':
		case 'JSONCompactEachRowWithNamesAndTypes': {
			let rows = jsonRows(data, false).map(row => {
				if (!Array.isArray(row)) {
					throw cannotParseText(
						`Cannot parse input: expected '[' before: ${JSON.stringify(row).slice(0, 40)}`
					)
				}

				return row
			})
			let names = columns

			if (name !== 'JSONCompactEachRow' && name !== 'JSONCompactStringsEachRow') {
				names = rows[0] as string[]
				rows = rows.slice(name === 'JSONCompactEachRowWithNamesAndTypes' ? 2 : 1)
			}

			return rows.map(row => ({ kind: 'json', values: zip(names, row) }))
		}
		case 'JSON':
		case 'JSONCompact': {
			const parsed = (parseJsonSequence(data)[0] ?? {}) as { data?: unknown[]; meta?: { name: string }[] }
			const names = parsed.meta?.map(column => column.name) ?? columns
			return (parsed.data ?? []).map(row => ({
				kind: 'json',
				values: Array.isArray(row) ? zip(names, row) : (row as Record<string, unknown>),
			}))
		}
		case 'TabSeparated':
		case 'TabSeparatedRaw':
		case 'TabSeparatedWithNames':
		case 'TabSeparatedWithNamesAndTypes': {
			let lines = splitLines(data)
			let names = columns

			if (name === 'TabSeparatedWithNames' || name === 'TabSeparatedWithNamesAndTypes') {
				names = lines[0]!.split('\t').map(field => unescape(field))
				lines = lines.slice(name === 'TabSeparatedWithNamesAndTypes' ? 2 : 1)
			}

			return lines.map(line => ({
				kind: 'text',
				values: zip(
					names,
					line.split('\t').map(field => (name === 'TabSeparatedRaw' ? field : tsvField(field)))
				),
			}))
		}
		case 'CSV':
		case 'CSVWithNames':
		case 'CSVWithNamesAndTypes': {
			let rows = csvRows(data)
			let names = columns

			if (name !== 'CSV') {
				names = rows[0]!.map(field => field ?? '')
				rows = rows.slice(name === 'CSVWithNamesAndTypes' ? 2 : 1)
			}

			return rows.map(row => ({ kind: 'text', values: zip(names, row) }))
		}
		case 'Values': {
			const trimmed = data.trim()

			if (trimmed === '') return []

			// (1,'a'),(2,'b') read as one array of tuples.
			const parsed = parseLiteralText(`[${trimmed.replace(/;\s*$/, '')}]`) as Value[]

			return parsed.map(row => {
				const values =
					row && typeof row === 'object' && 'items' in (row as object)
						? (row as { items: Value[] }).items
						: [row]
				return { kind: 'value', values: zip(columns, values) }
			})
		}
	}

	throw unknownFormat(`Input format ${format} is not supported by the in-memory ClickHouse`)
}
