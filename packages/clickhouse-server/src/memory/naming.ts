import { Expr, Query, Select } from './ast'
import { formatFloatLiteral } from './parser'
import { formatNumber } from './types'
import { DateTimeValue, DateValue, TupleValue, Value } from './values'

const quoteString = (value: string) => {
	return `'${value
		.replaceAll('\\', '\\\\')
		.replaceAll("'", "\\'")
		.replaceAll('\n', '\\n')
		.replaceAll('\t', '\\t')
		.replaceAll('\r', '\\r')
		.replaceAll('\0', '\\0')}'`
}

export const quoteIdentifier = (name: string) => {
	return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name) ? name : `\`${name.replaceAll('\\', '\\\\').replaceAll('`', '\\`')}\``
}

const literalText = (value: Value): string => {
	if (value === null) return 'NULL'
	if (typeof value === 'string') return quoteString(value)
	if (typeof value === 'boolean') return value ? 'true' : 'false'
	if (typeof value === 'number') return Number.isInteger(value) ? formatNumber(value) : formatFloatLiteral(value)
	if (typeof value === 'bigint') return value.toString()
	if (Array.isArray(value)) return `[${value.map(literalText).join(', ')}]`
	if (value instanceof TupleValue) return `(${value.items.map(literalText).join(', ')})`
	if (value instanceof DateTimeValue || value instanceof DateValue) return String(value)

	return JSON.stringify(value)
}

const literal = (expr: Extract<Expr, { kind: 'literal' }>) => expr.text ?? literalText(expr.value as Value)

// The name ClickHouse gives a result column without an alias: operators
// spelled as the functions they are, like plus(1, 1).
export const columnName = (expr: Expr): string => {
	switch (expr.kind) {
		case 'literal':
			return literal(expr)
		case 'identifier':
			return expr.parts.join('.')
		case 'param':
			return `_CAST(${quoteString(expr.name)}, ${quoteString(expr.type)})`
		case 'asterisk':
			return expr.table ? `${expr.table}.*` : '*'
		case 'lambda':
			return `lambda(tuple(${expr.params.join(', ')}), ${columnName(expr.body)})`
		case 'subquery':
			return `(${querySql(expr.query)})`
		case 'function': {
			const name = expr.distinct ? `${expr.name}Distinct` : expr.name
			const args = expr.args.map(arg => (arg.alias ? arg.alias : columnName(arg))).join(', ')

			if (name === 'array') return `[${args}]`
			if (name === 'tuple' && expr.args.length > 1) return `(${args})`

			const params = expr.params ? `(${expr.params.map(columnName).join(', ')})` : ''

			return `${name}${params}(${args})`
		}
	}
}

const INFIX: Record<string, [string, number]> = {
	or: ['OR', 1],
	and: ['AND', 2],
	equals: ['=', 4],
	notEquals: ['!=', 4],
	less: ['<', 4],
	greater: ['>', 4],
	lessOrEquals: ['<=', 4],
	greaterOrEquals: ['>=', 4],
	like: ['LIKE', 4],
	notLike: ['NOT LIKE', 4],
	ilike: ['ILIKE', 4],
	notILike: ['NOT ILIKE', 4],
	in: ['IN', 4],
	notIn: ['NOT IN', 4],
	globalIn: ['GLOBAL IN', 4],
	globalNotIn: ['GLOBAL NOT IN', 4],
	plus: ['+', 6],
	minus: ['-', 6],
	multiply: ['*', 7],
	divide: ['/', 7],
	modulo: ['%', 7],
}

// SQL text the way ClickHouse writes an expression back in its create
// table query & error messages: operators infix, INTERVAL as a function.
export const sql = (expr: Expr, parent = 0): string => {
	const text = (() => {
		switch (expr.kind) {
			case 'literal':
				return literal(expr)
			case 'identifier':
				return expr.parts.map(quoteIdentifier).join('.')
			case 'param':
				return `{${expr.name}:${expr.type}}`
			case 'asterisk':
				return expr.table ? `${expr.table}.*` : '*'
			case 'lambda':
				return `${expr.params.length === 1 ? expr.params[0] : `(${expr.params.join(', ')})`} -> (${sql(expr.body)})`
			case 'subquery':
				return `(${querySql(expr.query)})`
			case 'function': {
				const infix = INFIX[expr.name]

				if (infix && expr.args.length >= 2 && !expr.params) {
					const [operator, precedence] = infix
					const joined = expr.args.map(arg => sql(arg, precedence + 1)).join(` ${operator} `)
					return precedence < parent ? `(${joined})` : joined
				}

				if (expr.name === '__ttl') return expr.args.map(arg => sql(arg)).join(', ')
				if (expr.name === 'not' && expr.args.length === 1)
					return wrap(`NOT ${sql(expr.args[0]!, 3)}`, 3, parent)
				if (expr.name === 'negate' && expr.args.length === 1) return `-${sql(expr.args[0]!, 9)}`
				if (expr.name === 'isNull') return wrap(`${sql(expr.args[0]!, 5)} IS NULL`, 4, parent)
				if (expr.name === 'isNotNull') return wrap(`${sql(expr.args[0]!, 5)} IS NOT NULL`, 4, parent)
				if (expr.name === 'arrayElement' && expr.args.length === 2)
					return `${sql(expr.args[0]!, 10)}[${sql(expr.args[1]!)}]`
				if (
					expr.name === 'tupleElement' &&
					expr.args.length === 2 &&
					expr.args[1]!.kind === 'literal' &&
					typeof expr.args[1]!.value === 'number'
				) {
					return `${sql(expr.args[0]!, 10)}.${expr.args[1]!.value}`
				}
				if (expr.name === 'concat' && expr.args.length >= 2)
					return `concat(${expr.args.map(arg => sql(arg)).join(', ')})`
				if (expr.name === 'array') return `[${expr.args.map(arg => sql(arg)).join(', ')}]`
				if (expr.name === 'tuple' && expr.args.length > 1)
					return `(${expr.args.map(arg => sql(arg)).join(', ')})`

				const params = expr.params ? `(${expr.params.map(arg => sql(arg)).join(', ')})` : ''
				const distinct = expr.distinct ? 'DISTINCT ' : ''

				return `${expr.name}${params}(${distinct}${expr.args.map(arg => sql(arg)).join(', ')})`
			}
		}
	})()

	return expr.alias ? `${text} AS ${quoteIdentifier(expr.alias)}` : text
}

const wrap = (text: string, precedence: number, parent: number) => (precedence < parent ? `(${text})` : text)

const selectSql = (select: Select): string => {
	const parts = [
		`SELECT ${select.distinct ? 'DISTINCT ' : ''}${select.columns.map(column => sql(column)).join(', ')}`,
	]

	if (select.from) {
		const from = select.from
		const source =
			from.kind === 'table'
				? [from.database, from.name]
						.filter(Boolean)
						.map(name => quoteIdentifier(name!))
						.join('.')
				: from.kind === 'subquery'
					? `(${querySql(from.query)})`
					: `${from.name}(${from.args.map(arg => sql(arg)).join(', ')})`
		parts.push(`FROM ${source}${from.alias ? ` AS ${from.alias}` : ''}`)
	}

	if (select.where) parts.push(`WHERE ${sql(select.where)}`)
	if (select.groupBy.length > 0) parts.push(`GROUP BY ${select.groupBy.map(expr => sql(expr)).join(', ')}`)
	if (select.having) parts.push(`HAVING ${sql(select.having)}`)
	if (select.orderBy.length > 0)
		parts.push(
			`ORDER BY ${select.orderBy.map(item => `${sql(item.expr)}${item.direction === 'DESC' ? ' DESC' : ' ASC'}`).join(', ')}`
		)
	if (select.limit !== undefined) parts.push(`LIMIT ${select.limit}`)
	if (select.offset !== undefined) parts.push(`OFFSET ${select.offset}`)

	return parts.join(' ')
}

export const querySql = (query: Query): string => {
	return query.selects
		.map(selectSql)
		.reduce((text, select, index) => `${text} UNION ${query.distinct[index - 1] ? 'DISTINCT' : 'ALL'} ${select}`)
}
