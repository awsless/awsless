import {
	type Column,
	isBigInteger,
	isDateTime,
	isDecimal,
	parseType,
	tupleField,
	unwrapType,
} from '@awsless/clickhouse'

// What a column holds in TypeScript: what a query returns, and what an
// insert takes when that's wider (a Date also takes its text).
type ValueType = { select: string; insert?: string }

const NUMBERS = /^(U?Int(8|16|32)|Float(32|64))$/
const STRINGS = ['String', 'FixedString', 'UUID', 'IPv4', 'IPv6', 'Date', 'Date32']

// The names of an enum: Enum8('good' = 1, 'bad' = 2).
const enumNames = (args: string[]) => {
	return args.map(arg => arg.match(/^'((?:[^'\\]|\\.)*)'/)?.[0]).filter(name => name !== undefined)
}

// The values as the query builder returns them: a whole number past 2^53 is
// a bigint and a decimal a BigFloat, so both keep their digits, a moment is
// a Date and a day its text.
const valueType = (text: string): ValueType => {
	const type = unwrapType(parseType(text))
	const each = (wrap: (value: string) => string, ...items: ValueType[]): ValueType => ({
		select: wrap(items.map(item => item.select).join(', ')),
		insert: items.some(item => item.insert)
			? wrap(items.map(item => item.insert ?? item.select).join(', '))
			: undefined,
	})

	if (type.name === 'Nullable') {
		return each(value => `${value} | null`, valueType(type.args[0]!))
	}

	if (isBigInteger(type.name)) {
		return { select: 'bigint', insert: 'bigint | number | string' }
	}

	if (isDecimal(type.name)) {
		return { select: 'ClickHouseDecimal', insert: 'ClickHouseDecimal | number | string' }
	}

	if (isDateTime(type.name)) {
		return { select: 'Date', insert: 'Date | string' }
	}

	if (type.name === 'Bool') {
		return { select: 'boolean' }
	}

	if (NUMBERS.test(type.name)) {
		return { select: 'number' }
	}

	if (STRINGS.includes(type.name)) {
		return { select: 'string' }
	}

	if (type.name === 'Enum8' || type.name === 'Enum16' || type.name === 'Enum') {
		return { select: enumNames(type.args).join(' | ') || 'string' }
	}

	if (type.name === 'Array') {
		return each(value => `(${value})[]`, valueType(type.args[0]!))
	}

	if (type.name === 'Map') {
		return each(value => `Record<string, ${value}>`, valueType(type.args[1]!))
	}

	if (type.name === 'Tuple') {
		const fields = type.args.map(tupleField)
		const values = fields.map(field => valueType(field.type))

		// A tuple whose fields all have names is an object by those names.
		if (fields.length > 0 && fields.every(field => field.name)) {
			const object = (pick: (value: ValueType) => string) => {
				return `{ ${fields.map((field, index) => `${field.name}: ${pick(values[index]!)}`).join('; ')} }`
			}

			return {
				select: object(value => value.select),
				insert: values.some(value => value.insert) ? object(value => value.insert ?? value.select) : undefined,
			}
		}

		return each(value => `[${value}]`, ...values)
	}

	if (type.name === 'JSON' || type.name === 'Object') {
		return { select: 'Record<string, unknown>' }
	}

	return { select: 'unknown' }
}

// A column's type for the query builder. One with a default can be left
// out of an insert, and a materialized one is never written.
export const formatColumnType = (column: Column) => {
	const { select, insert } = valueType(column.type)

	if (column.materialized !== undefined) {
		return `ClickHouseGeneratedAlways<${select}>`
	}

	if (!insert) {
		return column.default !== undefined ? `ClickHouseGenerated<${select}>` : select
	}

	// ClickHouse changes rows with a mutation, so the builder never updates one.
	return `ClickHouseColumn<${select}, ${column.default !== undefined ? `${insert} | undefined` : insert}, never>`
}

// A table the way the query builder reads it: its row, a type per column.
export const formatTableType = (columns: Record<string, Column | string>, indent: string) => {
	return [
		'{',
		...Object.entries(columns).map(([name, column]) => {
			const key = /^[a-zA-Z_$][\w$]*$/.test(name) ? name : `'${name}'`

			return `${indent}\t${key}: ${formatColumnType(typeof column === 'string' ? { type: column } : column)}`
		}),
		`${indent}}`,
	].join('\n')
}
