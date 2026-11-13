import pg, { escapeLiteral } from 'pg'

// The limits of the RDS Data API, which every query has to fit whichever
// way it travels: what passes on a local Postgres also passes deployed.
// https://docs.aws.amazon.com/rdsdataservice/latest/APIReference/API_ExecuteStatement.html
// https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/CHAP_Limits.html
export const MAX_SQL_LENGTH = 65_536
const MAX_REQUEST_BYTES = 4 * 1024 * 1024
export const MAX_RESULT_BYTES = 1024 * 1024

// The seconds a statement gets before the Data API stops it.
export const STATEMENT_TIMEOUT = 45

type Statement = {
	sql: string
	// The line of the file it starts on, counted from 1.
	line: number
}

type Placeholder = {
	// Where "$n" starts & ends in the sql.
	start: number
	end: number
	index: number
	// Followed by a cast, like $1::jsonb.
	cast: boolean
}

type Scan = {
	statements: Statement[]
	placeholders: Placeholder[]
}

const isWord = (char: string | undefined) => char !== undefined && /[A-Za-z0-9_$\u0080-￿]/.test(char)

const DOLLAR_QUOTE = /^\$(?:[A-Za-z_\u0080-￿][A-Za-z0-9_\u0080-￿]*)?\$/

// Reads sql the way psql does, far enough to tell statements apart & to
// find the "$n" placeholders: both skip strings, quoted names, dollar
// quoted bodies and comments.
const scan = (sql: string): Scan => {
	const statements: Statement[] = []
	const placeholders: Placeholder[] = []

	let start = 0
	let hasCode = false
	let parens = 0
	// A function body written as BEGIN ATOMIC … END holds semicolons of
	// its own. Like psql, only a CREATE FUNCTION or PROCEDURE can have one.
	let words: string[] = []
	let begins = 0

	const end = (index: number) => {
		if (hasCode) {
			const text = sql.slice(start, index)
			const lead = text.length - text.trimStart().length

			statements.push({
				sql: text.trim(),
				line: sql.slice(0, start + lead).split('\n').length,
			})
		}

		start = index + 1
		hasCode = false
		parens = 0
		words = []
		begins = 0
	}

	const isRoutine = () => {
		const [first, second, third, fourth] = words
		const routine = (word: string | undefined) => word === 'function' || word === 'procedure'

		return first === 'create' && (routine(second) || (second === 'or' && third === 'replace' && routine(fourth)))
	}

	for (let index = 0; index < sql.length; index++) {
		const char = sql[index]!
		const next = sql[index + 1]

		if (char === '-' && next === '-') {
			const newline = sql.indexOf('\n', index)

			index = newline === -1 ? sql.length : newline
			continue
		}

		if (char === '/' && next === '*') {
			// Block comments nest.
			let depth = 1

			for (index += 2; index < sql.length && depth > 0; index++) {
				if (sql[index] === '/' && sql[index + 1] === '*') {
					depth++
					index++
				} else if (sql[index] === '*' && sql[index + 1] === '/') {
					depth--
					index++
				}
			}

			index--
			continue
		}

		if (/\s/.test(char)) {
			continue
		}

		if (char === ';' && parens <= 0 && begins === 0) {
			end(index)
			continue
		}

		hasCode = true

		if (char === "'") {
			// E'…' strings escape with a backslash, the others only double the quote.
			const escapes = /[eE]/.test(sql[index - 1] ?? '') && !isWord(sql[index - 2])

			for (index++; index < sql.length; index++) {
				if (escapes && sql[index] === '\\') {
					index++
				} else if (sql[index] === "'") {
					if (sql[index + 1] !== "'") {
						break
					}

					index++
				}
			}

			continue
		}

		if (char === '"') {
			for (index++; index < sql.length; index++) {
				if (sql[index] === '"') {
					if (sql[index + 1] !== '"') {
						break
					}

					index++
				}
			}

			continue
		}

		if (char === '$' && !isWord(sql[index - 1])) {
			const quote = DOLLAR_QUOTE.exec(sql.slice(index, index + 80))?.[0]

			if (quote) {
				const close = sql.indexOf(quote, index + quote.length)

				index = close === -1 ? sql.length : close + quote.length - 1
				continue
			}

			const digits = /^\d+/.exec(sql.slice(index + 1, index + 12))?.[0]

			if (digits) {
				const after = index + 1 + digits.length

				placeholders.push({
					start: index,
					end: after,
					index: Number(digits),
					cast: /^\s*::/.test(sql.slice(after, after + 40)),
				})

				index = after - 1
				continue
			}
		}

		if (char === '(') {
			parens++
		} else if (char === ')') {
			parens--
		} else if (/[A-Za-z_]/.test(char) && !isWord(sql[index - 1])) {
			const word = /^[A-Za-z_][A-Za-z0-9_$]*/.exec(sql.slice(index, index + 64))![0].toLowerCase()

			if (words.length < 4) {
				words.push(word)
			}

			if (parens === 0 && isRoutine()) {
				if (word === 'begin' || (word === 'case' && begins > 0)) {
					begins++
				} else if (word === 'end' && begins > 0) {
					begins--
				}
			}

			index += word.length - 1
		}
	}

	end(sql.length)

	return { statements, placeholders }
}

// The statements of a file, one by one: the Data API runs one per call.
export const splitStatements = (sql: string) => scan(sql).statements

type QueryConfig = {
	sql: string
	// The values that travel next to the sql, as text. Their names are
	// p1, p2 and up, written :p1 in the sql.
	parameters: { name: string; value: string | null }[]
}

type Prepare = (value: unknown) => string | Buffer | null

// The text pg sends for a value, so both ways of running a query send
// Postgres the same thing: a Date as a timestamp, an array as an array
// literal, an object as json.
const prepareValue = (pg as unknown as { utils: { prepareValue: Prepare } }).utils.prepareValue

const toText = (value: unknown) => {
	const prepared = prepareValue(value)

	return Buffer.isBuffer(prepared) ? `\\x${prepared.toString('hex')}` : prepared
}

// Turns a query with $n placeholders into what the Data API takes, which
// has no untyped parameters. A value becomes a quoted literal, which
// Postgres types from its place in the statement exactly like the untyped
// parameter pg sends: "project_id = $1" finds a uuid in a string. A value
// that the sql casts ($1::jsonb) travels as a text parameter instead, so
// a big one doesn't count against the length of the sql.
export const renderQuery = (sql: string, values: unknown[] = []): QueryConfig => {
	const { statements, placeholders } = scan(sql)

	if (statements.length > 1) {
		throw new TypeError(
			'A query is one statement: the Data API runs one per call. Send the statements one by one, or move them into a function.'
		)
	}

	const usedIndexes = new Set(placeholders.map(placeholder => placeholder.index))
	const highest = Math.max(0, ...usedIndexes)

	// Postgres refuses a query whose parameters don't match its placeholders.
	if (highest > values.length || usedIndexes.size < values.length) {
		throw new TypeError(
			`The query has ${usedIndexes.size} placeholders, up to $${highest}, but ${values.length} parameters were given.`
		)
	}

	const parameters = new Map<number, { name: string; value: string | null }>()
	let rendered = ''
	let position = 0

	for (const placeholder of placeholders) {
		const text = toText(values[placeholder.index - 1])
		let replacement: string

		if (text === null) {
			replacement = 'NULL'
		} else if (placeholder.cast) {
			const name = `p${placeholder.index}`

			parameters.set(placeholder.index, { name, value: text })
			replacement = `:${name}`
		} else {
			replacement = escapeLiteral(text)
		}

		rendered += sql.slice(position, placeholder.start) + replacement
		position = placeholder.end
	}

	rendered += sql.slice(position)

	const config = { sql: rendered, parameters: [...parameters.values()] }

	assertFits(config)

	return config
}

const assertFits = ({ sql, parameters }: QueryConfig) => {
	if (sql.length > MAX_SQL_LENGTH) {
		throw new RangeError(
			`The query is ${sql.length} characters with its values written in, over the ${MAX_SQL_LENGTH} the Data API takes. Cast a big value in the sql, like $1::jsonb or $1::text[]: a value with a cast travels next to the sql instead of in it.`
		)
	}

	const bytes =
		Buffer.byteLength(sql) + parameters.reduce((total, { value }) => total + Buffer.byteLength(value ?? ''), 0)

	if (bytes > MAX_REQUEST_BYTES) {
		throw new RangeError(
			`The query is ${bytes} bytes with its parameters, over the ${MAX_REQUEST_BYTES} the Data API takes in one request. Send it in parts.`
		)
	}
}
