import {
	AlterAction,
	ColumnDef,
	Expr,
	fn,
	IndexDef,
	Join,
	literal,
	OrderItem,
	Query,
	Select,
	Statement,
	TableSource,
} from './ast'
import { syntaxError } from './errors'
import { Token, tokenize } from './lexer'
import { TupleValue } from './values'

// Words that end an expression instead of naming it.
const RESERVED = new Set(
	[
		'FROM',
		'WHERE',
		'PREWHERE',
		'GROUP',
		'HAVING',
		'ORDER',
		'LIMIT',
		'OFFSET',
		'SETTINGS',
		'FORMAT',
		'UNION',
		'EXCEPT',
		'INTERSECT',
		'INTO',
		'AS',
		'ON',
		'USING',
		'JOIN',
		'INNER',
		'LEFT',
		'RIGHT',
		'FULL',
		'CROSS',
		'OUTER',
		'ANY',
		'ALL',
		'ARRAY',
		'GLOBAL',
		'FINAL',
		'SAMPLE',
		'WINDOW',
		'QUALIFY',
		'WITH',
		'SEMI',
		'ANTI',
		'ASOF',
		'AND',
		'OR',
		'NOT',
		'BETWEEN',
		'LIKE',
		'ILIKE',
		'IN',
		'IS',
		'ASC',
		'DESC',
		'ASCENDING',
		'DESCENDING',
		'NULLS',
		'THEN',
		'ELSE',
		'END',
		'WHEN',
		'BY',
		'VALUES',
		'SELECT',
		'FETCH',
		'TTL',
		'ENGINE',
		'PARTITION',
		'PRIMARY',
		'COMMENT',
		'CODEC',
		'DEFAULT',
		'MATERIALIZED',
		'ALIAS',
		'EPHEMERAL',
		'AFTER',
		'FIRST',
		'REGEXP',
		'COLLATE',
		'DIV',
		'MOD',
	].map(word => word)
)

const INTERVAL_UNITS: Record<string, string> = {
	NANOSECOND: 'Nanosecond',
	NANOSECONDS: 'Nanosecond',
	NS: 'Nanosecond',
	MICROSECOND: 'Microsecond',
	MICROSECONDS: 'Microsecond',
	US: 'Microsecond',
	MILLISECOND: 'Millisecond',
	MILLISECONDS: 'Millisecond',
	MS: 'Millisecond',
	SECOND: 'Second',
	SECONDS: 'Second',
	SS: 'Second',
	S: 'Second',
	MINUTE: 'Minute',
	MINUTES: 'Minute',
	MI: 'Minute',
	N: 'Minute',
	HOUR: 'Hour',
	HOURS: 'Hour',
	HH: 'Hour',
	H: 'Hour',
	DAY: 'Day',
	DAYS: 'Day',
	DD: 'Day',
	D: 'Day',
	WEEK: 'Week',
	WEEKS: 'Week',
	WK: 'Week',
	WW: 'Week',
	MONTH: 'Month',
	MONTHS: 'Month',
	MM: 'Month',
	M: 'Month',
	QUARTER: 'Quarter',
	QUARTERS: 'Quarter',
	QQ: 'Quarter',
	Q: 'Quarter',
	YEAR: 'Year',
	YEARS: 'Year',
	YYYY: 'Year',
	YY: 'Year',
}

// ClickHouse writes float literals back shortest, with a trailing dot
// when they're whole: 1.0 is "1.", 1.50 is "1.5".
export const formatFloatLiteral = (value: number) => {
	if (!Number.isFinite(value)) return Number.isNaN(value) ? 'nan' : value > 0 ? 'inf' : '-inf'

	const text = String(value)

	return /[.eE]/.test(text) ? text : `${text}.`
}

const parseNumber = (text: string): Expr => {
	if (/^0x/i.test(text)) return literal(parseInt(text, 16), String(parseInt(text, 16)))
	if (/^0b/i.test(text)) return literal(parseInt(text.slice(2), 2), String(parseInt(text.slice(2), 2)))

	if (/[.eE]/.test(text)) {
		const value = Number(text)
		return { kind: 'literal', value, text: formatFloatLiteral(value), float: true } as Expr
	}

	const big = BigInt(text)
	const value = big <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(big) : big

	return literal(value, String(big))
}

// A string literal as ClickHouse writes it back in column names.
const quoteLiteral = (value: string) => {
	return `'${value
		.replaceAll('\\', '\\\\')
		.replaceAll("'", "\\'")
		.replaceAll('\n', '\\n')
		.replaceAll('\t', '\\t')
		.replaceAll('\r', '\\r')
		.replaceAll('\0', '\\0')}'`
}

export const isLiteral = (expr: Expr): expr is Extract<Expr, { kind: 'literal' }> => expr.kind === 'literal'

class Parser {
	private pos = 0
	private readonly tokens: Token[]

	constructor(private readonly sql: string) {
		this.tokens = tokenize(sql)
	}

	// ---------------------------------------------------------------
	// tokens

	private peek(offset = 0): Token {
		return this.tokens[Math.min(this.pos + offset, this.tokens.length - 1)]!
	}

	private next(): Token {
		const token = this.peek()
		if (token.kind !== 'eof') this.pos++
		return token
	}

	private fail(expected: string): never {
		const token = this.peek()
		const near = token.kind === 'eof' ? 'end of query' : this.sql.slice(token.pos, token.pos + 20)
		throw syntaxError(`Syntax error: failed at position ${token.pos + 1} (${near}): ${near}. Expected ${expected}`)
	}

	isKeyword(word: string, offset = 0) {
		const token = this.peek(offset)
		return token.kind === 'ident' && !token.quoted && token.value.toUpperCase() === word
	}

	private acceptKeyword(...words: string[]) {
		if (words.every((word, index) => this.isKeyword(word, index))) {
			this.pos += words.length
			return true
		}

		return false
	}

	private expectKeyword(...words: string[]) {
		if (!this.acceptKeyword(...words)) {
			this.fail(words.join(' '))
		}
	}

	private isOp(value: string, offset = 0) {
		const token = this.peek(offset)
		return token.kind === 'op' && token.value === value
	}

	private acceptOp(value: string) {
		if (this.isOp(value)) {
			this.pos++
			return true
		}

		return false
	}

	private expectOp(value: string) {
		if (!this.acceptOp(value)) {
			this.fail(`'${value}'`)
		}
	}

	private identifier(): string {
		const token = this.next()

		if (token.kind !== 'ident') {
			this.pos--
			this.fail('identifier')
		}

		return token.value
	}

	private string(): string {
		const token = this.next()

		if (token.kind !== 'string') {
			this.pos--
			this.fail('string literal')
		}

		return token.value
	}

	private integer(): number {
		const token = this.next()

		if (token.kind !== 'number') {
			this.pos--
			this.fail('number')
		}

		return Number(token.value)
	}

	// [db.]name, or a {name:Identifier} parameter resolved later.
	private tableName(): { database?: string; name: string; param?: string } {
		if (this.peek().kind === 'param') {
			const token = this.next() as { name: string }
			return { name: '', param: token.name }
		}

		const first = this.identifier()

		if (this.acceptOp('.')) {
			return { database: first, name: this.identifier() }
		}

		return { name: first }
	}

	// A data type, read as its source text: Name or Name(...).
	parseTypeText(): string {
		const start = this.peek().pos
		this.identifier()

		if (this.isOp('(')) {
			let depth = 0

			do {
				const token = this.next()
				if (token.kind === 'eof') this.fail("')'")
				if (token.kind === 'op' && token.value === '(') depth++
				if (token.kind === 'op' && token.value === ')') depth--
			} while (depth > 0)
		}

		return this.sql.slice(start, this.peek().pos).trim()
	}

	private typeTextUntil(): string {
		return this.parseTypeText()
	}

	// ---------------------------------------------------------------
	// statements

	parseStatement(): Statement {
		const statement = this.statement()

		this.acceptOp(';')

		if (this.peek().kind !== 'eof') {
			if (this.statementStart()) {
				throw syntaxError('Syntax error (Multi-statements are not allowed)')
			}

			this.fail('end of query')
		}

		return statement
	}

	private statementStart() {
		return ['SELECT', 'INSERT', 'CREATE', 'ALTER', 'DROP', 'WITH'].some(word => this.isKeyword(word))
	}

	private statement(): Statement {
		if (this.isKeyword('SELECT') || this.isKeyword('WITH') || this.isOp('(')) {
			const start = this.peek().pos
			const query = this.parseQuery()
			const settings = this.acceptKeyword('SETTINGS') ? this.settingsMap() : {}
			let format: string | undefined

			if (this.acceptKeyword('FORMAT')) {
				format = this.identifier()
			}

			if (this.acceptKeyword('SETTINGS')) {
				Object.assign(settings, this.settingsMap())
			}

			return { kind: 'query', query, format, settings, text: this.sql.slice(start, this.peek().pos).trim() }
		}

		if (this.acceptKeyword('INSERT')) return this.insert()
		if (this.acceptKeyword('CREATE')) return this.create()
		if (this.acceptKeyword('ALTER')) return this.alter()

		if (this.acceptKeyword('DROP')) {
			if (this.acceptKeyword('DATABASE')) {
				const ifExists = this.acceptKeyword('IF', 'EXISTS')
				const name = this.identifier()
				this.acceptKeyword('SYNC')
				return { kind: 'drop-database', ifExists, name }
			}

			this.acceptKeyword('TEMPORARY')
			if (!this.acceptKeyword('TABLE'))
				this.acceptKeyword('VIEW') || this.acceptKeyword('DICTIONARY') || this.fail('TABLE')

			const ifExists = this.acceptKeyword('IF', 'EXISTS')
			const table = this.tableName()

			this.acceptKeyword('SYNC') || this.acceptKeyword('NO', 'DELAY')

			return { kind: 'drop-table', ifExists, ...table }
		}

		if (this.acceptKeyword('TRUNCATE')) {
			this.acceptKeyword('TABLE')
			const ifExists = this.acceptKeyword('IF', 'EXISTS')
			const table = this.tableName()
			this.acceptKeyword('SYNC')
			return { kind: 'truncate', ifExists, ...table }
		}

		if (this.acceptKeyword('RENAME')) {
			this.expectKeyword('TABLE')
			const from = this.tableName()
			this.expectKeyword('TO')
			const to = this.tableName()
			return { kind: 'rename-table', from, to }
		}

		if (this.acceptKeyword('DELETE')) {
			this.expectKeyword('FROM')
			const table = this.tableName()
			this.expectKeyword('WHERE')
			return { kind: 'delete', ...table, where: this.expression() }
		}

		if (this.acceptKeyword('OPTIMIZE')) {
			this.expectKeyword('TABLE')
			const table = this.tableName()
			const final = this.acceptKeyword('FINAL')
			this.acceptKeyword('DEDUPLICATE')
			return { kind: 'optimize', ...table, final }
		}

		if (this.acceptKeyword('EXISTS')) {
			this.acceptKeyword('TEMPORARY')
			this.acceptKeyword('TABLE')
			const table = this.tableName()
			return { kind: 'exists', ...table, format: this.trailingFormat() }
		}

		if (this.acceptKeyword('SHOW')) {
			if (this.acceptKeyword('TABLES')) {
				return { kind: 'show-tables', format: this.trailingFormat() }
			}

			this.expectKeyword('CREATE')
			this.acceptKeyword('TABLE')
			const table = this.tableName()
			return { kind: 'show-create', ...table, format: this.trailingFormat() }
		}

		if (this.acceptKeyword('DESCRIBE') || this.acceptKeyword('DESC')) {
			this.acceptKeyword('TABLE')
			const table = this.tableName()
			return { kind: 'describe', ...table, format: this.trailingFormat() }
		}

		if (this.acceptKeyword('SET')) {
			return { kind: 'set', settings: this.settingsMap() }
		}

		if (this.acceptKeyword('USE')) {
			return { kind: 'use', database: this.identifier() }
		}

		this.fail(
			'SELECT, INSERT, CREATE, ALTER, DROP, TRUNCATE, DELETE, OPTIMIZE, RENAME, SHOW, DESCRIBE, EXISTS or SET'
		)
	}

	private trailingFormat() {
		return this.acceptKeyword('FORMAT') ? this.identifier() : undefined
	}

	private settingsList(): [string, unknown][] {
		const settings: [string, unknown][] = []

		do {
			const name = this.identifier()
			this.expectOp('=')
			const value = this.primary()

			if (!isLiteral(value)) {
				this.fail('literal')
			}

			settings.push([name, value.value])
		} while (this.acceptOp(','))

		return settings
	}

	private settingsMap() {
		return Object.fromEntries(this.settingsList())
	}

	private insert(): Statement {
		this.expectKeyword('INTO')
		this.acceptKeyword('TABLE')

		if (this.acceptKeyword('FUNCTION')) {
			throw syntaxError('INSERT INTO FUNCTION is not supported by the in-memory ClickHouse')
		}

		const table = this.tableName()
		let columns: string[] | undefined

		if (this.acceptOp('(')) {
			columns = []

			do {
				columns.push(this.identifier())
			} while (this.acceptOp(','))

			this.expectOp(')')
		}

		const settings = this.acceptKeyword('SETTINGS') ? this.settingsMap() : {}

		if (this.acceptKeyword('VALUES')) {
			const values: Expr[][] = []

			do {
				this.expectOp('(')
				const row: Expr[] = []

				if (!this.isOp(')')) {
					do {
						row.push(this.expression())
					} while (this.acceptOp(','))
				}

				this.expectOp(')')
				values.push(row)
			} while (this.acceptOp(',') || this.isOp('('))

			return { kind: 'insert', ...table, columns, values, settings }
		}

		if (this.isKeyword('FORMAT')) {
			this.next()
			const formatToken = this.next()

			if (formatToken.kind !== 'ident') {
				this.fail('format name')
			}

			// The data runs from the end of the format name to the end of the
			// text, & the http body follows it.
			const start = formatToken.pos + formatToken.value.length
			const data = this.sql.slice(start).replace(/^[ \t]*\r?\n?/, '')

			this.pos = this.tokens.length - 1

			return { kind: 'insert', ...table, columns, format: formatToken.value, data, settings }
		}

		if (this.isKeyword('SELECT') || this.isKeyword('WITH') || this.isOp('(')) {
			return { kind: 'insert', ...table, columns, select: this.parseQuery(), settings }
		}

		// INSERT INTO t without a format reads the body as VALUES.
		if (this.peek().kind === 'eof') {
			return { kind: 'insert', ...table, columns, format: 'Values', data: '', settings }
		}

		this.fail('VALUES, FORMAT or SELECT')
	}

	private create(): Statement {
		const orReplace = this.acceptKeyword('OR', 'REPLACE')

		if (this.acceptKeyword('DATABASE')) {
			const ifNotExists = this.acceptKeyword('IF', 'NOT', 'EXISTS')
			const name = this.identifier()

			if (this.acceptKeyword('ENGINE')) {
				this.expectOp('=')
				this.identifier()
				if (this.acceptOp('(')) this.expectOp(')')
			}

			return { kind: 'create-database', ifNotExists, name }
		}

		this.acceptKeyword('TEMPORARY')

		if (!this.acceptKeyword('TABLE')) {
			throw syntaxError('Only CREATE TABLE & CREATE DATABASE are supported by the in-memory ClickHouse')
		}

		const ifNotExists = this.acceptKeyword('IF', 'NOT', 'EXISTS')
		const table = this.tableName()
		const columns: ColumnDef[] = []
		const indexes: IndexDef[] = []

		if (this.acceptOp('(')) {
			do {
				if (this.acceptKeyword('INDEX')) {
					indexes.push(this.indexDef())
				} else if (this.isKeyword('PROJECTION') || this.isKeyword('CONSTRAINT')) {
					throw syntaxError(
						`${this.peek().kind === 'ident' ? (this.peek() as { value: string }).value : ''} isn't supported by the in-memory ClickHouse`
					)
				} else if (this.acceptKeyword('PRIMARY', 'KEY')) {
					this.primaryKeyClause()
				} else {
					columns.push(this.columnDef())
				}
			} while (this.acceptOp(','))

			this.expectOp(')')
		}

		let engine: { name: string; args: Expr[] } = { name: 'MergeTree', args: [] }
		let partitionBy: Expr | undefined
		let primaryKey: Expr[] | undefined
		let orderBy: Expr[] | undefined
		let ttl: Expr | undefined
		let settings: [string, unknown][] = []
		let comment: string | undefined
		let as: Query | undefined

		while (true) {
			if (this.acceptKeyword('ENGINE')) {
				this.acceptOp('=')
				const name = this.identifier()
				const args: Expr[] = []

				if (this.acceptOp('(')) {
					if (!this.isOp(')')) {
						do {
							args.push(this.expression())
						} while (this.acceptOp(','))
					}

					this.expectOp(')')
				}

				engine = { name, args }
			} else if (this.acceptKeyword('PARTITION', 'BY')) {
				partitionBy = this.expression()
			} else if (this.acceptKeyword('PRIMARY', 'KEY')) {
				primaryKey = this.keyList()
			} else if (this.acceptKeyword('ORDER', 'BY')) {
				orderBy = this.keyList()
			} else if (this.acceptKeyword('SAMPLE', 'BY')) {
				this.expression()
			} else if (this.acceptKeyword('TTL')) {
				ttl = this.ttlList()
			} else if (this.acceptKeyword('SETTINGS')) {
				settings = this.settingsList()
			} else if (this.acceptKeyword('COMMENT')) {
				comment = this.string()
			} else if (this.acceptKeyword('AS')) {
				as = this.parseQuery()
			} else {
				break
			}
		}

		return {
			kind: 'create-table',
			ifNotExists,
			orReplace,
			...table,
			columns,
			indexes,
			engine,
			partitionBy,
			primaryKey,
			orderBy,
			ttl,
			settings,
			comment,
			as,
		}
	}

	// TTL rules separated by commas; more than one keeps them all in a
	// list the create query writes back the same way.
	private ttlList(): Expr {
		const rules: Expr[] = []

		do {
			rules.push(this.expression())

			if (this.acceptKeyword('DELETE')) continue
			if (this.isKeyword('TO') || this.isKeyword('GROUP') || this.isKeyword('RECOMPRESS')) {
				throw syntaxError('TTL moves, GROUP BY & RECOMPRESS are not supported by the in-memory ClickHouse')
			}
		} while (this.acceptOp(','))

		return rules.length === 1 ? rules[0]! : fn('__ttl', ...rules)
	}

	private primaryKeyClause() {
		return this.keyList()
	}

	// ORDER BY (a, b), ORDER BY a or ORDER BY tuple().
	private keyList(): Expr[] {
		const expr = this.expression()

		if (expr.kind === 'function' && expr.name === 'tuple') {
			return expr.args
		}

		if (expr.kind === 'literal' && expr.value instanceof TupleValue) {
			return expr.value.items.map(item => literal(item))
		}

		return [expr]
	}

	private columnDef(): ColumnDef {
		const name = this.identifier()
		const column: ColumnDef = { name }

		const stop = [
			'DEFAULT',
			'MATERIALIZED',
			'ALIAS',
			'EPHEMERAL',
			'COMMENT',
			'CODEC',
			'TTL',
			'NULL',
			'NOT',
			'PRIMARY',
			'FIRST',
			'AFTER',
			'SETTINGS',
			'REMOVE',
		]

		if (this.peek().kind === 'ident' && !stop.some(word => this.isKeyword(word))) {
			column.type = this.typeTextUntil()
		}

		while (true) {
			if (this.acceptKeyword('NOT', 'NULL')) continue

			if (this.acceptKeyword('NULL')) {
				column.type = column.type ? `Nullable(${column.type})` : column.type
				continue
			}

			const kind = (['DEFAULT', 'MATERIALIZED', 'ALIAS', 'EPHEMERAL'] as const).find(word => this.isKeyword(word))

			if (kind) {
				this.next()
				column.defaultKind = kind

				if (!(kind === 'EPHEMERAL' && (this.isOp(',') || this.isOp(')')))) {
					column.defaultExpr = this.expression()
				}

				continue
			}

			if (this.acceptKeyword('COMMENT')) {
				column.comment = this.string()
				continue
			}

			if (this.acceptKeyword('CODEC')) {
				this.expectOp('(')
				const start = this.peek().pos
				let depth = 0

				while (!(depth === 0 && this.isOp(')'))) {
					const token = this.next()
					if (token.kind === 'eof') this.fail("')'")
					if (token.kind === 'op' && token.value === '(') depth++
					if (token.kind === 'op' && token.value === ')') depth--
				}

				column.codec = this.sql.slice(start, this.peek().pos).trim()
				this.expectOp(')')
				continue
			}

			if (this.acceptKeyword('TTL')) {
				column.ttl = this.expression()
				continue
			}

			if (this.acceptKeyword('PRIMARY', 'KEY')) continue

			break
		}

		return column
	}

	private indexDef(): IndexDef {
		const name = this.identifier()
		const expr = this.expression()
		this.expectKeyword('TYPE')
		const type = this.typeTextUntil()
		const granularity = this.acceptKeyword('GRANULARITY') ? this.integer() : 1

		return { name, expr, type, granularity }
	}

	private position() {
		if (this.acceptKeyword('FIRST')) return { first: true }
		if (this.acceptKeyword('AFTER')) return { after: this.identifier() }

		return {}
	}

	private alter(): Statement {
		this.expectKeyword('TABLE')
		const table = this.tableName()
		const actions: AlterAction[] = []

		do {
			actions.push(this.alterAction())
		} while (this.acceptOp(','))

		this.acceptKeyword('SETTINGS') && this.settingsList()

		return { kind: 'alter', ...table, actions }
	}

	private alterAction(): AlterAction {
		if (this.acceptKeyword('ADD', 'COLUMN')) {
			const ifNotExists = this.acceptKeyword('IF', 'NOT', 'EXISTS')
			const column = this.columnDef()
			return { kind: 'add-column', ifNotExists, column, ...this.position() }
		}

		if (this.acceptKeyword('DROP', 'COLUMN')) {
			const ifExists = this.acceptKeyword('IF', 'EXISTS')
			return { kind: 'drop-column', ifExists, name: this.identifier() }
		}

		if (this.acceptKeyword('MODIFY', 'COLUMN')) {
			const ifExists = this.acceptKeyword('IF', 'EXISTS')

			if (this.peek(1).kind === 'ident' && this.isKeyword('REMOVE', 1)) {
				const name = this.identifier()
				this.expectKeyword('REMOVE')
				const remove = this.identifier().toUpperCase()
				return { kind: 'modify-column', ifExists, column: { name }, remove }
			}

			const column = this.columnDef()

			if (this.acceptKeyword('REMOVE')) {
				return { kind: 'modify-column', ifExists, column, remove: this.identifier().toUpperCase() }
			}

			return { kind: 'modify-column', ifExists, column, ...this.position() }
		}

		if (this.acceptKeyword('RENAME', 'COLUMN')) {
			const ifExists = this.acceptKeyword('IF', 'EXISTS')
			const from = this.identifier()
			this.expectKeyword('TO')
			return { kind: 'rename-column', ifExists, from, to: this.identifier() }
		}

		if (this.acceptKeyword('COMMENT', 'COLUMN')) {
			const ifExists = this.acceptKeyword('IF', 'EXISTS')
			const name = this.identifier()
			return { kind: 'comment-column', ifExists, name, comment: this.string() }
		}

		if (this.acceptKeyword('ADD', 'INDEX')) {
			const ifNotExists = this.acceptKeyword('IF', 'NOT', 'EXISTS')
			return { kind: 'add-index', ifNotExists, index: this.indexDef(), ...this.position() }
		}

		if (this.acceptKeyword('DROP', 'INDEX')) {
			const ifExists = this.acceptKeyword('IF', 'EXISTS')
			return { kind: 'drop-index', ifExists, name: this.identifier() }
		}

		if (this.acceptKeyword('MATERIALIZE', 'INDEX')) {
			const name = this.identifier()
			this.skipPartition()
			return { kind: 'materialize-index', name }
		}

		if (this.acceptKeyword('CLEAR', 'INDEX')) {
			const name = this.identifier()
			this.skipPartition()
			return { kind: 'clear-index', name }
		}

		if (this.acceptKeyword('MATERIALIZE', 'COLUMN')) {
			const name = this.identifier()
			this.skipPartition()
			return { kind: 'materialize-column', name }
		}

		if (this.acceptKeyword('MATERIALIZE', 'TTL')) {
			this.skipPartition()
			return { kind: 'materialize-ttl' }
		}

		if (this.acceptKeyword('MODIFY', 'TTL')) {
			return { kind: 'modify-ttl', ttl: this.ttlList() }
		}

		if (this.acceptKeyword('REMOVE', 'TTL')) return { kind: 'remove-ttl' }

		if (this.acceptKeyword('MODIFY', 'SETTING')) {
			return { kind: 'modify-setting', settings: this.settingsList() }
		}

		if (this.acceptKeyword('RESET', 'SETTING')) {
			const names: string[] = []

			do {
				names.push(this.identifier())
			} while (this.acceptOp(',') && this.peek().kind === 'ident' && !this.isKeyword('MODIFY', 0))

			return { kind: 'reset-setting', names }
		}

		if (this.acceptKeyword('MODIFY', 'COMMENT')) {
			return { kind: 'modify-comment', comment: this.string() }
		}

		if (this.acceptKeyword('MODIFY', 'ORDER', 'BY')) {
			return { kind: 'modify-order-by', exprs: this.keyList() }
		}

		if (this.acceptKeyword('DELETE')) {
			this.skipPartition()
			this.expectKeyword('WHERE')
			return { kind: 'delete', where: this.expression() }
		}

		if (this.acceptKeyword('UPDATE')) {
			const assignments: [string, Expr][] = []

			do {
				const name = this.identifier()
				this.expectOp('=')
				assignments.push([name, this.expression()])
			} while (this.acceptOp(','))

			this.skipPartition()
			this.expectKeyword('WHERE')
			return { kind: 'update', assignments, where: this.expression() }
		}

		throw syntaxError(
			`Syntax error: failed at position ${this.peek().pos + 1}: ALTER action not supported by the in-memory ClickHouse`
		)
	}

	private skipPartition() {
		if (this.acceptKeyword('IN', 'PARTITION')) {
			this.expression()
		}
	}

	// ---------------------------------------------------------------
	// queries

	parseQuery(): Query {
		const selects: Select[] = [this.selectOrParenthesized()]
		const distinct: boolean[] = []

		while (this.acceptKeyword('UNION')) {
			if (this.acceptKeyword('ALL')) distinct.push(false)
			else {
				this.acceptKeyword('DISTINCT')
				distinct.push(true)
			}

			selects.push(this.selectOrParenthesized())
		}

		return { kind: 'union', selects, distinct }
	}

	private selectOrParenthesized(): Select {
		if (this.isOp('(')) {
			this.next()
			const query = this.parseQuery()
			this.expectOp(')')

			if (query.selects.length === 1) {
				return query.selects[0]!
			}

			// A parenthesized union becomes a subquery source.
			return this.emptySelect({
				columns: [{ kind: 'asterisk' }],
				from: { kind: 'subquery', query },
			})
		}

		return this.select()
	}

	private emptySelect(props: Partial<Select>): Select {
		return {
			kind: 'select',
			with: [],
			distinct: false,
			columns: [],
			joins: [],
			groupBy: [],
			withTotals: false,
			orderBy: [],
			settings: {},
			...props,
		}
	}

	private select(): Select {
		const select = this.emptySelect({})

		if (this.acceptKeyword('WITH')) {
			do {
				// WITH name AS (SELECT ...) or WITH expr AS name.
				if (
					this.peek().kind === 'ident' &&
					this.isKeyword('AS', 1) &&
					this.isOp('(', 2) &&
					(this.isKeyword('SELECT', 3) || this.isKeyword('WITH', 3))
				) {
					const name = this.identifier()
					this.expectKeyword('AS')
					this.expectOp('(')
					const query = this.parseQuery()
					this.expectOp(')')
					select.with.push({ name, query })
				} else {
					const expr = this.expression()
					this.expectKeyword('AS')
					select.with.push({ name: this.identifier(), expr })
				}
			} while (this.acceptOp(','))
		}

		this.expectKeyword('SELECT')
		select.distinct = this.acceptKeyword('DISTINCT')
		this.acceptKeyword('ALL')

		if (this.acceptKeyword('TOP')) {
			select.limit = this.integer()
		}

		do {
			select.columns.push(this.selectItem())
		} while (this.acceptOp(','))

		if (this.acceptKeyword('FROM')) {
			select.from = this.tableSource()

			while (true) {
				if (this.acceptOp(',')) {
					select.joins.push({ kind: 'CROSS', source: this.tableSource() })
					continue
				}

				const join = this.join()
				if (!join) break
				select.joins.push(join)
			}
		}

		if (this.isKeyword('ARRAY', 0) || (this.isKeyword('LEFT') && this.isKeyword('ARRAY', 1))) {
			const left = this.acceptKeyword('LEFT')
			this.expectKeyword('ARRAY', 'JOIN')
			const exprs: Expr[] = []

			do {
				exprs.push(this.aliased(this.expression()))
			} while (this.acceptOp(','))

			select.arrayJoin = { exprs, left }
		}

		if (this.acceptKeyword('PREWHERE')) select.prewhere = this.expression()
		if (this.acceptKeyword('WHERE')) select.where = this.expression()

		if (this.acceptKeyword('GROUP', 'BY')) {
			if (this.acceptKeyword('ALL')) {
				select.groupBy = [{ kind: 'asterisk' }]
			} else {
				do {
					select.groupBy.push(this.expression())
				} while (this.acceptOp(','))
			}

			if (this.acceptKeyword('WITH', 'TOTALS')) select.withTotals = true
			if (this.isKeyword('WITH') && (this.isKeyword('ROLLUP', 1) || this.isKeyword('CUBE', 1))) {
				throw syntaxError('WITH ROLLUP & WITH CUBE are not supported by the in-memory ClickHouse')
			}
		}

		if (this.acceptKeyword('HAVING')) select.having = this.expression()

		if (this.isKeyword('WINDOW') || this.isKeyword('QUALIFY')) {
			throw syntaxError('Window functions are not supported by the in-memory ClickHouse')
		}

		if (this.acceptKeyword('ORDER', 'BY')) {
			if (this.acceptKeyword('ALL')) {
				select.orderBy.push({ expr: { kind: 'asterisk' }, direction: this.direction() })
			} else {
				do {
					select.orderBy.push(this.orderItem())
				} while (this.acceptOp(','))
			}
		}

		// LIMIT n BY exprs, then LIMIT n [OFFSET m] or LIMIT m, n.
		while (this.acceptKeyword('LIMIT')) {
			let limit = this.integer()
			let offset = 0

			if (this.acceptOp(',')) {
				offset = limit
				limit = this.integer()
			} else if (this.acceptKeyword('OFFSET')) {
				offset = this.integer()
			}

			if (this.acceptKeyword('BY')) {
				const exprs: Expr[] = []

				do {
					exprs.push(this.expression())
				} while (this.acceptOp(','))

				select.limitBy = { limit, offset, exprs }
				continue
			}

			if (this.acceptKeyword('WITH', 'TIES')) {
				throw syntaxError('LIMIT WITH TIES is not supported by the in-memory ClickHouse')
			}

			select.limit = limit
			select.offset = offset || undefined
		}

		if (this.acceptKeyword('OFFSET')) {
			select.offset = this.integer()
			this.acceptKeyword('ROWS') || this.acceptKeyword('ROW')

			if (this.acceptKeyword('FETCH')) {
				this.acceptKeyword('FIRST') || this.acceptKeyword('NEXT')
				select.limit = this.integer()
				this.acceptKeyword('ROWS') || this.acceptKeyword('ROW')
				this.expectKeyword('ONLY')
			}
		}

		if (this.isKeyword('SETTINGS') && !this.isKeyword('FORMAT', 1)) {
			// Settings belong to the innermost select when a union follows,
			// else to the whole statement, which reads them there.
			if (this.isKeyword('UNION', this.settingsLength() + 1)) {
				this.next()
				select.settings = this.settingsMap()
			}
		}

		return select
	}

	private settingsLength() {
		let offset = 1
		while (
			this.peek(offset).kind !== 'eof' &&
			!this.isKeyword('UNION', offset) &&
			!this.isKeyword('FORMAT', offset) &&
			!this.isOp(')', offset)
		)
			offset++
		return offset - 1
	}

	private direction(): 'ASC' | 'DESC' {
		if (this.acceptKeyword('DESC') || this.acceptKeyword('DESCENDING')) return 'DESC'
		this.acceptKeyword('ASC') || this.acceptKeyword('ASCENDING')
		return 'ASC'
	}

	private orderItem(): OrderItem {
		const expr = this.aliased(this.expression())
		const direction = this.direction()
		let nulls: 'FIRST' | 'LAST' | undefined

		if (this.acceptKeyword('NULLS')) {
			nulls = this.acceptKeyword('FIRST') ? 'FIRST' : (this.expectKeyword('LAST'), 'LAST')
		}

		if (this.acceptKeyword('COLLATE')) this.string()

		if (this.acceptKeyword('WITH', 'FILL')) {
			throw syntaxError('ORDER BY WITH FILL is not supported by the in-memory ClickHouse')
		}

		return { expr, direction, nulls }
	}

	private join(): Join | undefined {
		const start = this.pos
		this.acceptKeyword('GLOBAL')

		let strictness: 'ANY' | 'ALL' | undefined
		if (this.acceptKeyword('ANY')) strictness = 'ANY'
		else if (this.acceptKeyword('ALL')) strictness = 'ALL'
		else if (this.isKeyword('ASOF') || this.isKeyword('SEMI') || this.isKeyword('ANTI')) {
			throw syntaxError(
				`${(this.peek() as { value: string }).value} JOIN is not supported by the in-memory ClickHouse`
			)
		}

		let kind: Join['kind'] = 'INNER'

		if (this.acceptKeyword('INNER')) kind = 'INNER'
		else if (this.acceptKeyword('LEFT')) kind = 'LEFT'
		else if (this.acceptKeyword('RIGHT')) kind = 'RIGHT'
		else if (this.acceptKeyword('FULL')) kind = 'FULL'
		else if (this.acceptKeyword('CROSS')) kind = 'CROSS'

		this.acceptKeyword('OUTER')

		if (!this.acceptKeyword('JOIN')) {
			this.pos = start
			return
		}

		const source = this.tableSource()
		const join: Join = { kind, strictness, source }

		if (this.acceptKeyword('ON')) {
			join.on = this.expression()
		} else if (this.acceptKeyword('USING')) {
			const parenthesized = this.acceptOp('(')
			join.using = []

			do {
				join.using.push(this.identifier())
			} while (this.acceptOp(','))

			if (parenthesized) this.expectOp(')')
		}

		return join
	}

	private tableSource(): TableSource {
		let source: TableSource

		if (this.acceptOp('(')) {
			const query = this.parseQuery()
			this.expectOp(')')
			source = { kind: 'subquery', query }
		} else if (this.peek().kind === 'param') {
			// FROM {table:Identifier}, resolved once the parameters are known.
			const token = this.next() as { name: string }
			source = { kind: 'table', name: '', param: token.name } as TableSource
		} else if (this.peek().kind === 'ident' && this.isOp('(', 1)) {
			const name = this.identifier()
			this.expectOp('(')
			const args: Expr[] = []

			if (!this.isOp(')')) {
				do {
					args.push(this.expression())
				} while (this.acceptOp(','))
			}

			this.expectOp(')')
			source = { kind: 'function', name, args }
		} else {
			source = { kind: 'table', ...this.tableName() }
		}

		if (this.acceptKeyword('FINAL')) (source as { final?: boolean }).final = true

		if (this.acceptKeyword('AS')) {
			source.alias = this.identifier()
		} else if (this.peek().kind === 'ident' && !this.reserved()) {
			source.alias = this.identifier()
		}

		if (this.acceptKeyword('FINAL')) (source as { final?: boolean }).final = true

		if (this.acceptKeyword('SAMPLE')) {
			throw syntaxError('SAMPLE is not supported by the in-memory ClickHouse')
		}

		return source
	}

	private reserved(offset = 0) {
		const token = this.peek(offset)
		return token.kind === 'ident' && !token.quoted && RESERVED.has(token.value.toUpperCase())
	}

	private selectItem(): Expr {
		return this.aliased(this.expression(), true)
	}

	private aliased(expr: Expr, implicit = false): Expr {
		if (this.acceptKeyword('AS')) {
			return { ...expr, alias: this.identifier() }
		}

		if (implicit && this.peek().kind === 'ident' && !this.reserved()) {
			return { ...expr, alias: this.identifier() }
		}

		return expr
	}

	// ---------------------------------------------------------------
	// expressions

	expression(): Expr {
		return this.lambdaOrTernary()
	}

	private lambdaOrTernary(): Expr {
		// x -> body or (x, y) -> body
		if (this.peek().kind === 'ident' && this.isOp('->', 1)) {
			const param = this.identifier()
			this.expectOp('->')
			return { kind: 'lambda', params: [param], body: this.expression() }
		}

		if (this.isOp('(')) {
			let offset = 1
			const params: string[] = []

			while (this.peek(offset).kind === 'ident') {
				params.push((this.peek(offset) as { value: string }).value)
				offset++
				if (this.isOp(',', offset)) offset++
				else break
			}

			if (params.length > 0 && this.isOp(')', offset) && this.isOp('->', offset + 1)) {
				this.pos += offset + 2
				return { kind: 'lambda', params, body: this.expression() }
			}
		}

		const condition = this.or()

		if (this.acceptOp('?')) {
			const then = this.expression()
			this.expectOp(':')
			const otherwise = this.expression()
			return fn('if', condition, then, otherwise)
		}

		return condition
	}

	private or(): Expr {
		let left = this.and()

		while (this.acceptKeyword('OR')) {
			const right = this.and()
			left =
				left.kind === 'function' && left.name === 'or' && !left.alias
					? { ...left, args: [...left.args, right] }
					: fn('or', left, right)
		}

		return left
	}

	private and(): Expr {
		let left = this.not()

		while (this.acceptKeyword('AND')) {
			const right = this.not()
			left =
				left.kind === 'function' && left.name === 'and' && !left.alias
					? { ...left, args: [...left.args, right] }
					: fn('and', left, right)
		}

		return left
	}

	private not(): Expr {
		if (this.isKeyword('NOT') && !this.isOp('(', 1)) {
			this.next()
			return fn('not', this.not())
		}

		if (this.isKeyword('NOT') && this.isOp('(', 1)) {
			this.next()
			return fn('not', this.comparison())
		}

		return this.comparison()
	}

	private comparison(): Expr {
		const left = this.concat()

		const binary: Record<string, string> = {
			'=': 'equals',
			'==': 'equals',
			'!=': 'notEquals',
			'<>': 'notEquals',
			'<': 'less',
			'>': 'greater',
			'<=': 'lessOrEquals',
			'>=': 'greaterOrEquals',
		}

		const token = this.peek()

		if (token.kind === 'op' && binary[token.value]) {
			this.next()
			return fn(binary[token.value]!, left, this.concat())
		}

		if (this.acceptKeyword('IS')) {
			const negate = this.acceptKeyword('NOT')
			this.expectKeyword('NULL')
			return fn(negate ? 'isNotNull' : 'isNull', left)
		}

		const negate =
			this.isKeyword('NOT') &&
			(this.isKeyword('LIKE', 1) ||
				this.isKeyword('ILIKE', 1) ||
				this.isKeyword('IN', 1) ||
				this.isKeyword('BETWEEN', 1) ||
				this.isKeyword('REGEXP', 1))

		if (negate) this.next()

		if (this.acceptKeyword('LIKE')) return fn(negate ? 'notLike' : 'like', left, this.concat())
		if (this.acceptKeyword('ILIKE')) return fn(negate ? 'notILike' : 'ilike', left, this.concat())
		if (this.acceptKeyword('REGEXP')) {
			const match = fn('match', left, this.concat())
			return negate ? fn('not', match) : match
		}

		if (this.acceptKeyword('BETWEEN')) {
			const low = this.concat()
			this.expectKeyword('AND')
			const high = this.concat()

			return negate
				? fn('or', fn('less', left, low), fn('greater', left, high))
				: fn('and', fn('greaterOrEquals', left, low), fn('lessOrEquals', left, high))
		}

		const global = this.isKeyword('GLOBAL') && (this.isKeyword('IN', 1) || this.isKeyword('NOT', 1))
		if (global) this.next()

		if (!negate && global && this.acceptKeyword('NOT')) {
			this.expectKeyword('IN')
			return fn('globalNotIn', left, this.inRight())
		}

		if (this.acceptKeyword('IN')) {
			return fn(negate ? (global ? 'globalNotIn' : 'notIn') : global ? 'globalIn' : 'in', left, this.inRight())
		}

		return left
	}

	private inRight(): Expr {
		if (this.isOp('(') && (this.isKeyword('SELECT', 1) || this.isKeyword('WITH', 1))) {
			this.next()
			const query = this.parseQuery()
			this.expectOp(')')
			return { kind: 'subquery', query }
		}

		return this.concat()
	}

	private concat(): Expr {
		let left = this.additive()

		while (this.acceptOp('||')) {
			const right = this.additive()
			left =
				left.kind === 'function' && left.name === 'concat' && !left.alias
					? { ...left, args: [...left.args, right] }
					: fn('concat', left, right)
		}

		return left
	}

	private additive(): Expr {
		let left = this.multiplicative()

		while (true) {
			if (this.acceptOp('+')) left = fn('plus', left, this.multiplicative())
			else if (this.acceptOp('-')) left = fn('minus', left, this.multiplicative())
			else return left
		}
	}

	private multiplicative(): Expr {
		let left = this.unary()

		while (true) {
			if (this.acceptOp('*')) left = fn('multiply', left, this.unary())
			else if (this.acceptOp('/')) left = fn('divide', left, this.unary())
			else if (this.acceptOp('%') || this.acceptKeyword('MOD')) left = fn('modulo', left, this.unary())
			else if (this.acceptKeyword('DIV')) left = fn('intDiv', left, this.unary())
			else return left
		}
	}

	private unary(): Expr {
		if (this.acceptOp('-')) {
			const operand = this.unary()

			if (
				operand.kind === 'literal' &&
				(typeof operand.value === 'number' || typeof operand.value === 'bigint') &&
				!operand.alias
			) {
				const value = typeof operand.value === 'bigint' ? -operand.value : -operand.value
				const text = (operand as { float?: boolean }).float
					? formatFloatLiteral(value as number)
					: String(value)
				return { ...operand, value, text }
			}

			return fn('negate', operand)
		}

		if (this.acceptOp('+')) {
			return this.unary()
		}

		return this.postfix(this.primary())
	}

	private postfix(base: Expr): Expr {
		while (true) {
			if (this.acceptOp('[')) {
				const index = this.expression()
				this.expectOp(']')
				base = fn('arrayElement', base, index)
				continue
			}

			if (this.isOp('.') && this.peek(1).kind === 'number') {
				this.next()
				base = fn('tupleElement', base, literal(this.integer()))
				continue
			}

			if (this.isOp('.') && this.peek(1).kind === 'ident' && base.kind !== 'identifier') {
				this.next()
				base = fn('tupleElement', base, literal(this.identifier()))
				continue
			}

			if (this.acceptOp('::')) {
				const type = this.parseTypeText()
				const value =
					base.kind === 'literal' && typeof base.value !== 'string' && base.text ? literal(base.text) : base
				base = fn('CAST', value, literal(type))
				continue
			}

			return base
		}
	}

	private primary(): Expr {
		const token = this.peek()

		if (token.kind === 'number') {
			this.next()
			return parseNumber(token.value)
		}

		if (token.kind === 'string') {
			this.next()
			return literal(token.value, quoteLiteral(token.value))
		}

		if (token.kind === 'param') {
			this.next()
			return { kind: 'param', name: token.name, type: token.type }
		}

		if (token.kind === 'op') {
			if (token.value === '(') return this.parenthesized()
			if (token.value === '[') return this.array()

			if (token.value === '*') {
				this.next()
				return this.asteriskModifiers({ kind: 'asterisk' })
			}
		}

		if (token.kind !== 'ident') {
			this.fail('expression')
		}

		if (!token.quoted) {
			const upper = token.value.toUpperCase()

			if (upper === 'NULL') {
				this.next()
				return literal(null, 'NULL')
			}

			if (upper === 'TRUE' || upper === 'FALSE') {
				this.next()
				return literal(upper === 'TRUE', upper.toLowerCase())
			}

			if ((upper === 'INF' || upper === 'NAN') && !this.isOp('(', 1)) {
				this.next()
				return literal(upper === 'INF' ? Infinity : NaN, upper.toLowerCase())
			}

			if (upper === 'CASE') return this.caseExpression()
			if (upper === 'CAST' && this.isOp('(', 1)) return this.cast()
			if (upper === 'INTERVAL' && !this.isOp('(', 1)) return this.interval()
			if ((upper === 'DATE' || upper === 'TIMESTAMP') && this.peek(1).kind === 'string') {
				this.next()
				const value = this.string()
				return fn(upper === 'DATE' ? 'toDate' : 'toDateTime', literal(value))
			}

			if (upper === 'EXISTS' && this.isOp('(', 1)) {
				this.next()
				this.expectOp('(')
				const query = this.parseQuery()
				this.expectOp(')')
				return fn('exists', { kind: 'subquery', query })
			}

			if (
				upper === 'EXTRACT' &&
				this.isOp('(', 1) &&
				this.peek(3).kind === 'ident' &&
				this.isKeyword('FROM', 3)
			) {
				this.next()
				this.expectOp('(')
				const part = this.identifier().toUpperCase()
				this.expectKeyword('FROM')
				const value = this.expression()
				this.expectOp(')')
				const name = {
					YEAR: 'toYear',
					MONTH: 'toMonth',
					DAY: 'toDayOfMonth',
					HOUR: 'toHour',
					MINUTE: 'toMinute',
					SECOND: 'toSecond',
				}[part]

				if (!name) this.fail('YEAR, MONTH, DAY, HOUR, MINUTE or SECOND')

				return fn(name, value)
			}
		}

		const name = this.identifier()

		if (this.isOp('(')) {
			return this.functionCall(name)
		}

		const parts = [name]

		while (this.isOp('.') && (this.peek(1).kind === 'ident' || this.isOp('*', 1))) {
			this.next()

			if (this.acceptOp('*')) {
				return this.asteriskModifiers({ kind: 'asterisk', table: parts.join('.') })
			}

			parts.push(this.identifier())
		}

		return { kind: 'identifier', parts }
	}

	private asteriskModifiers(expr: Extract<Expr, { kind: 'asterisk' }>): Expr {
		if (this.acceptKeyword('EXCEPT')) {
			const parenthesized = this.acceptOp('(')
			const except: string[] = []

			do {
				except.push(this.identifier())
			} while (parenthesized && this.acceptOp(','))

			if (parenthesized) this.expectOp(')')

			return { ...expr, except }
		}

		return expr
	}

	private functionCall(written: string): Expr {
		// TRIM & friends are SQL syntax ClickHouse reads as its own functions.
		const name = { trim: 'trimBoth', ltrim: 'trimLeft', rtrim: 'trimRight' }[written.toLowerCase()] ?? written

		this.expectOp('(')
		let distinct = false
		const args = this.argumentList(() => {
			if (this.acceptKeyword('DISTINCT')) distinct = true
			else this.acceptKeyword('ALL')
		})

		let call: Expr = { kind: 'function', name, args, ...(distinct ? { distinct } : {}) }

		// Parametric aggregates: quantile(0.5)(x).
		if (this.isOp('(')) {
			this.next()
			const inner = this.argumentList(() => {})
			call = { kind: 'function', name, params: args, args: inner }
		}

		if (this.acceptKeyword('FILTER')) {
			throw syntaxError('FILTER clauses are not supported by the in-memory ClickHouse, use the -If combinator')
		}

		if (this.isKeyword('RESPECT') || this.isKeyword('IGNORE')) {
			this.next()
			this.expectKeyword('NULLS')
		}

		if (this.acceptKeyword('OVER')) {
			throw syntaxError('Window functions are not supported by the in-memory ClickHouse')
		}

		return call
	}

	private argumentList(prefix: () => void): Expr[] {
		const args: Expr[] = []

		if (this.acceptOp(')')) {
			return args
		}

		prefix()

		if (this.isOp('*') && this.isOp(')', 1)) {
			this.next()
			this.next()
			return args
		}

		do {
			args.push(this.aliased(this.expression()))
		} while (this.acceptOp(','))

		this.expectOp(')')

		return args
	}

	private parenthesized(): Expr {
		this.expectOp('(')

		if (this.isKeyword('SELECT') || this.isKeyword('WITH')) {
			const query = this.parseQuery()
			this.expectOp(')')
			return { kind: 'subquery', query }
		}

		if (this.acceptOp(')')) {
			return literal(new TupleValue([]), '()')
		}

		const items: Expr[] = [this.aliased(this.expression())]

		while (this.acceptOp(',')) {
			if (this.isOp(')')) break
			items.push(this.aliased(this.expression()))
		}

		this.expectOp(')')

		if (items.length === 1) {
			return items[0]!
		}

		if (items.every(item => item.kind === 'literal' && !item.alias)) {
			return literal(
				new TupleValue(items.map(item => (item as { value: unknown }).value as never)),
				`(${items.map(item => (item as { text?: string }).text ?? '').join(', ')})`
			)
		}

		return fn('tuple', ...items)
	}

	private array(): Expr {
		this.expectOp('[')
		const items: Expr[] = []

		if (!this.isOp(']')) {
			do {
				if (this.isOp(']')) break
				items.push(this.expression())
			} while (this.acceptOp(','))
		}

		this.expectOp(']')

		if (items.every(item => item.kind === 'literal' && !item.alias)) {
			return literal(
				items.map(item => (item as { value: unknown }).value),
				`[${items.map(item => (item as { text?: string }).text ?? '').join(', ')}]`
			)
		}

		return fn('array', ...items)
	}

	private caseExpression(): Expr {
		this.next()
		let subject: Expr | undefined

		if (!this.isKeyword('WHEN')) {
			subject = this.expression()
		}

		const args: Expr[] = []

		while (this.acceptKeyword('WHEN')) {
			args.push(this.expression())
			this.expectKeyword('THEN')
			args.push(this.expression())
		}

		const otherwise = this.acceptKeyword('ELSE') ? this.expression() : literal(null, 'NULL')
		this.expectKeyword('END')

		if (subject) {
			return fn('caseWithExpression', subject, ...args, otherwise)
		}

		return fn('multiIf', ...args, otherwise)
	}

	private cast(): Expr {
		this.next()
		this.expectOp('(')
		const value = this.expression()

		if (this.acceptKeyword('AS')) {
			const type = this.parseTypeText()
			this.expectOp(')')
			return fn('CAST', value, literal(type))
		}

		this.expectOp(',')
		const type = this.expression()
		this.expectOp(')')

		return fn('CAST', value, type)
	}

	private interval(): Expr {
		this.next()
		let value: Expr
		let unit: string | undefined

		// INTERVAL '1 day' or INTERVAL 1 DAY.
		if (this.peek().kind === 'string') {
			const text = this.string().trim()
			const match = /^(-?\d+)\s*([a-zA-Z]+)$/.exec(text)

			if (!match) this.fail('interval')

			value = literal(Number(match[1]), match[1])
			unit = INTERVAL_UNITS[match[2]!.toUpperCase()]
		} else {
			value = this.concat()
			unit = INTERVAL_UNITS[this.identifier().toUpperCase()]
		}

		if (!unit) this.fail('interval unit')

		return fn(`toInterval${unit}`, value)
	}
}

export const parseStatement = (sql: string): Statement => {
	return new Parser(sql).parseStatement()
}

export const parseExpression = (sql: string): Expr => {
	const parser = new Parser(sql)
	return parser.expression()
}

// The type of a query parameter or a CAST, read with the same tokenizer.
export const parseTypeTokens = (sql: string) => new Parser(sql)
