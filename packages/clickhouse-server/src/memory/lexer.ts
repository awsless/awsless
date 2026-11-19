import { syntaxError } from './errors'

export type Token =
	| { kind: 'ident'; value: string; quoted: boolean; pos: number }
	| { kind: 'number'; value: string; pos: number }
	| { kind: 'string'; value: string; pos: number }
	| { kind: 'op'; value: string; pos: number }
	| { kind: 'param'; name: string; type: string; pos: number }
	| { kind: 'eof'; pos: number }

const OPERATORS = [
	'->',
	'<=',
	'>=',
	'!=',
	'<>',
	'==',
	'||',
	'::',
	'+',
	'-',
	'*',
	'/',
	'%',
	'=',
	'<',
	'>',
	'(',
	')',
	'[',
	']',
	',',
	'.',
	';',
	':',
	'?',
	'{',
	'}',
]

const ESCAPES: Record<string, string> = {
	n: '\n',
	t: '\t',
	r: '\r',
	b: '\b',
	f: '\f',
	'0': '\0',
	a: '\x07',
	v: '\v',
	e: '\x1b',
}

// Reads a quoted string or identifier, with backslash escapes & the
// quote doubled to stand for itself, the way ClickHouse reads both.
const readQuoted = (sql: string, start: number, quote: string) => {
	let value = ''
	let i = start + 1

	while (i < sql.length) {
		const char = sql[i]!

		if (char === '\\') {
			const next = sql[i + 1]

			if (next === undefined) {
				break
			}

			if (next === 'x' && /^[0-9a-fA-F]{2}$/.test(sql.slice(i + 2, i + 4))) {
				value += String.fromCharCode(parseInt(sql.slice(i + 2, i + 4), 16))
				i += 4
				continue
			}

			value += ESCAPES[next] ?? next
			i += 2
			continue
		}

		if (char === quote) {
			if (sql[i + 1] === quote) {
				value += quote
				i += 2
				continue
			}

			return { value, end: i + 1 }
		}

		value += char
		i++
	}

	throw syntaxError(
		`Syntax error: failed at position ${start + 1}: unterminated quoted ${quote === "'" ? 'string' : 'identifier'}`
	)
}

const isIdentStart = (char: string) => /[a-zA-Z_]/.test(char)
const isIdentPart = (char: string) => /[a-zA-Z0-9_$]/.test(char)

export const tokenize = (sql: string): Token[] => {
	const tokens: Token[] = []
	let i = 0

	while (i < sql.length) {
		const char = sql[i]!

		if (/\s/.test(char)) {
			i++
			continue
		}

		if (char === '-' && sql[i + 1] === '-') {
			while (i < sql.length && sql[i] !== '\n') i++
			continue
		}

		if (char === '#' && (sql[i + 1] === ' ' || sql[i + 1] === '!')) {
			while (i < sql.length && sql[i] !== '\n') i++
			continue
		}

		if (char === '/' && sql[i + 1] === '*') {
			const end = sql.indexOf('*/', i + 2)
			i = end === -1 ? sql.length : end + 2
			continue
		}

		if (char === "'") {
			const { value, end } = readQuoted(sql, i, "'")
			tokens.push({ kind: 'string', value, pos: i })
			i = end
			continue
		}

		if (char === '`' || char === '"') {
			const { value, end } = readQuoted(sql, i, char)
			tokens.push({ kind: 'ident', value, quoted: true, pos: i })
			i = end
			continue
		}

		// A query parameter, {name:Type}.
		if (char === '{') {
			const match = /^\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*/.exec(sql.slice(i))

			if (match) {
				let depth = 0
				let j = i + match[0].length

				for (; j < sql.length; j++) {
					const c = sql[j]
					if (c === '(') depth++
					else if (c === ')') depth--
					else if (c === "'") j = readQuoted(sql, j, "'").end - 1
					else if (c === '}' && depth === 0) break
				}

				if (j >= sql.length) {
					throw syntaxError(`Syntax error: failed at position ${i + 1}: unterminated query parameter`)
				}

				tokens.push({ kind: 'param', name: match[1]!, type: sql.slice(i + match[0].length, j).trim(), pos: i })
				i = j + 1
				continue
			}
		}

		// After a name, a bracket or a number, a dot is element access like
		// tuple.1, not the start of a number like .5.
		const last = tokens.at(-1)
		const accessor =
			last !== undefined &&
			(last.kind === 'ident' ||
				last.kind === 'number' ||
				(last.kind === 'op' && (last.value === ')' || last.value === ']')))

		const number = /^(0x[0-9a-fA-F]+|0b[01]+|(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?)/.exec(sql.slice(i))

		if (number && (/\d/.test(char) || (char === '.' && !accessor && /\d/.test(sql[i + 1] ?? '')))) {
			let text = number[0]

			// tuple.1.2 reads as two accesses, not the number 1.2.
			if (accessor && last?.kind === 'op' && last.value === '.' && text.includes('.')) {
				text = text.slice(0, text.indexOf('.'))
			}

			tokens.push({ kind: 'number', value: text, pos: i })
			i += text.length
			continue
		}

		if (isIdentStart(char)) {
			let j = i + 1
			while (j < sql.length && isIdentPart(sql[j]!)) j++
			tokens.push({ kind: 'ident', value: sql.slice(i, j), quoted: false, pos: i })
			i = j
			continue
		}

		const op = OPERATORS.find(op => sql.startsWith(op, i))

		if (op) {
			tokens.push({ kind: 'op', value: op, pos: i })
			i += op.length
			continue
		}

		throw syntaxError(
			`Syntax error: failed at position ${i + 1} ('${char}'): ${sql.slice(i, i + 20)}. Unrecognized token`
		)
	}

	tokens.push({ kind: 'eof', pos: sql.length })

	return tokens
}
