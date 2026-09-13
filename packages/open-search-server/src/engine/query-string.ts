import type { RangeBounds } from './query'

export type QueryNode =
	| { kind: 'term'; field?: string; text: string; fuzzy?: number | 'auto'; boost?: number }
	| { kind: 'phrase'; field?: string; text: string; slop?: number; boost?: number }
	| { kind: 'range'; field?: string; bounds: RangeBounds; boost?: number }
	| { kind: 'group'; field?: string; clauses: StringQueryClause[]; boost?: number }
	| { kind: 'exists'; field: string; boost?: number }
	| { kind: 'all'; field?: string; boost?: number }

export type StringQueryClause = { occur: 'must' | 'should' | 'must_not'; node: QueryNode }

type Conjunction = 'none' | 'and' | 'or'
type Modifier = 'none' | 'must' | 'not'

class ParseError extends Error {}

// Lucene's classic clause bookkeeping: AND/OR rewrite the previous clause
// and the default operator decides what a bare term means.
const addClause = (
	clauses: StringQueryClause[],
	conjunction: Conjunction,
	modifier: Modifier,
	node: QueryNode,
	defaultOperator: 'and' | 'or'
) => {
	const last = clauses[clauses.length - 1]
	if (last && conjunction === 'and' && last.occur !== 'must_not') last.occur = 'must'
	if (last && defaultOperator === 'and' && conjunction === 'or' && last.occur !== 'must_not') last.occur = 'should'

	let occur: StringQueryClause['occur']
	if (modifier === 'not') occur = 'must_not'
	else if (modifier === 'must') occur = 'must'
	else if (defaultOperator === 'or') occur = conjunction === 'and' ? 'must' : 'should'
	else occur = conjunction === 'or' ? 'should' : 'must'

	clauses.push({ occur, node })
}

const TERM_STOP = new Set([' ', '\t', '\n', '\r', '(', ')', ':', '^', '~', '"', '[', ']', '{', '}'])

class Parser {
	pos = 0

	constructor(
		readonly text: string,
		readonly defaultOperator: 'and' | 'or'
	) {}

	peek(offset = 0) {
		return this.text[this.pos + offset]
	}

	eof() {
		return this.pos >= this.text.length
	}

	skipSpace() {
		while (!this.eof() && /\s/.test(this.peek()!)) this.pos++
	}

	matchWord(word: string) {
		if (this.text.startsWith(word, this.pos)) {
			const after = this.text[this.pos + word.length]
			if (after === undefined || /[\s(]/.test(after) || word === '&&' || word === '||') {
				this.pos += word.length
				return true
			}
		}
		return false
	}

	parseClauses(): StringQueryClause[] {
		const clauses: StringQueryClause[] = []

		while (true) {
			this.skipSpace()
			if (this.eof() || this.peek() === ')') break

			let conjunction: Conjunction = 'none'
			if (this.matchWord('AND') || this.matchWord('&&')) conjunction = 'and'
			else if (this.matchWord('OR') || this.matchWord('||')) conjunction = 'or'
			this.skipSpace()
			if (this.eof() || this.peek() === ')') {
				if (conjunction !== 'none') throw new ParseError('dangling operator')
				break
			}

			let modifier: Modifier = 'none'
			if (this.matchWord('NOT')) modifier = 'not'
			else if (this.peek() === '+') {
				modifier = 'must'
				this.pos++
			} else if (this.peek() === '-' || this.peek() === '!') {
				modifier = 'not'
				this.pos++
			}
			this.skipSpace()
			if (this.eof()) throw new ParseError('dangling modifier')

			const node = this.parseClause()
			addClause(clauses, conjunction, modifier, node, this.defaultOperator)
		}

		return clauses
	}

	parseClause(): QueryNode {
		const char = this.peek()
		if (char === '(') return this.parseGroup(undefined)
		if (char === '"') return this.parsePhrase(undefined)
		if (char === '[' || char === '{') return this.parseRange(undefined)

		const text = this.readTerm()
		if (this.peek() === ':') {
			this.pos++
			return this.parseFieldValue(text)
		}
		return this.finishTerm(undefined, text)
	}

	parseFieldValue(field: string): QueryNode {
		const char = this.peek()
		if (char === '(') return this.parseGroup(field)
		if (char === '"') return this.parsePhrase(field)
		if (char === '[' || char === '{') return this.parseRange(field)

		if (char === '>' || char === '<') {
			const operator = this.peek(1) === '=' ? `${char}=` : char
			this.pos += operator.length
			const value = this.readTerm()
			if (value === '') throw new ParseError('missing range value')
			const bounds: RangeBounds = {}
			if (operator === '>') bounds.gt = value
			else if (operator === '>=') bounds.gte = value
			else if (operator === '<') bounds.lt = value
			else bounds.lte = value
			return { kind: 'range', field, bounds, boost: this.readBoost() }
		}

		if (field === '_exists_') {
			const target = this.readTerm()
			if (target === '') throw new ParseError('missing field for _exists_')
			return { kind: 'exists', field: target, boost: this.readBoost() }
		}

		const text = this.readTerm()
		if (text === '') throw new ParseError('missing field value')
		if (field === '*' && text === '*') return { kind: 'all', boost: this.readBoost() }
		return this.finishTerm(field, text)
	}

	finishTerm(field: string | undefined, text: string): QueryNode {
		if (text === '') throw new ParseError('empty term')
		if (text === '*' && field === undefined) return { kind: 'all', boost: this.readBoost() }

		let fuzzy: number | 'auto' | undefined
		if (this.peek() === '~') {
			this.pos++
			const digits = this.readNumber()
			fuzzy = digits === undefined ? 'auto' : Math.min(2, Math.round(digits))
		}
		const boost = this.readBoost()
		return { kind: 'term', field, text: unescape(text), fuzzy, boost }
	}

	parseGroup(field: string | undefined): QueryNode {
		this.pos++
		const clauses = this.parseClauses()
		if (this.peek() !== ')') throw new ParseError('missing closing parenthesis')
		this.pos++
		return { kind: 'group', field, clauses, boost: this.readBoost() }
	}

	parsePhrase(field: string | undefined): QueryNode {
		this.pos++
		let text = ''
		while (!this.eof() && this.peek() !== '"') {
			if (this.peek() === '\\' && this.peek(1) !== undefined) this.pos++
			text += this.peek()
			this.pos++
		}
		if (this.eof()) throw new ParseError('missing closing quote')
		this.pos++

		let slop: number | undefined
		if (this.peek() === '~') {
			this.pos++
			slop = this.readNumber() ?? 0
		}
		return { kind: 'phrase', field, text, slop, boost: this.readBoost() }
	}

	parseRange(field: string | undefined): QueryNode {
		const open = this.peek()
		this.pos++
		const close = this.text.indexOf(open === '[' ? ']' : '}', this.pos)
		const closeAlt = this.text.indexOf(open === '[' ? '}' : ']', this.pos)
		const end = close === -1 ? closeAlt : closeAlt === -1 ? close : Math.min(close, closeAlt)
		if (end === -1) throw new ParseError('missing closing bracket')

		const inner = this.text.slice(this.pos, end)
		const closing = this.text[end]
		this.pos = end + 1

		const parts = inner.split(/\s+TO\s+/)
		if (parts.length !== 2) throw new ParseError('range needs TO')
		const [from, to] = parts.map(p => p.trim().replace(/^"|"$/g, ''))

		const bounds: RangeBounds = {}
		if (from !== '*' && from !== '') {
			if (open === '[') bounds.gte = from
			else bounds.gt = from
		}
		if (to !== '*' && to !== '') {
			if (closing === ']') bounds.lte = to
			else bounds.lt = to
		}
		return { kind: 'range', field, bounds, boost: this.readBoost() }
	}

	readTerm(): string {
		let text = ''
		while (!this.eof()) {
			const char = this.peek()!
			if (char === '\\' && this.peek(1) !== undefined) {
				text += char + this.peek(1)
				this.pos += 2
				continue
			}
			if (TERM_STOP.has(char)) break
			text += char
			this.pos++
		}
		return text
	}

	readNumber(): number | undefined {
		const match = /^\d+(\.\d+)?/.exec(this.text.slice(this.pos))
		if (!match) return undefined
		this.pos += match[0].length
		return Number(match[0])
	}

	readBoost(): number | undefined {
		if (this.peek() !== '^') return undefined
		this.pos++
		const value = this.readNumber()
		if (value === undefined) throw new ParseError('missing boost value')
		return value
	}
}

const unescape = (text: string) => text.replace(/\\(.)/g, '$1')

export const parseQueryString = (text: string, defaultOperator: 'and' | 'or'): StringQueryClause[] => {
	const parser = new Parser(text, defaultOperator)
	const clauses = parser.parseClauses()
	parser.skipSpace()
	if (!parser.eof()) throw new ParseError(`unexpected input at ${parser.pos}`)
	return clauses
}

// The simple syntax never fails: anything that does not parse is searched
// for literally, which is the whole point of simple_query_string.
export const parseSimpleQueryString = (text: string, defaultOperator: 'and' | 'or'): StringQueryClause[] => {
	const tokens = tokenizeSimple(text)
	let pos = 0

	const parseGroup = (): StringQueryClause[] => {
		const clauses: StringQueryClause[] = []
		let conjunction: Conjunction = 'none'
		let modifier: Modifier = 'none'

		while (pos < tokens.length) {
			const token = tokens[pos]!
			if (token.type === 'close') break
			pos++

			if (token.type === 'and') {
				conjunction = 'and'
				continue
			}
			if (token.type === 'or') {
				conjunction = 'or'
				continue
			}
			if (token.type === 'not') {
				modifier = 'not'
				continue
			}

			let node: QueryNode
			if (token.type === 'open') {
				const inner = parseGroup()
				if (tokens[pos]?.type === 'close') pos++
				node = { kind: 'group', clauses: inner }
			} else if (token.type === 'phrase') {
				node = { kind: 'phrase', text: token.text, slop: token.slop }
			} else if (token.type === 'term') {
				node = { kind: 'term', text: token.text, fuzzy: token.fuzzy }
			} else {
				continue
			}

			addClause(clauses, conjunction, modifier, node, defaultOperator)
			conjunction = 'none'
			modifier = 'none'
		}

		return clauses
	}

	const clauses = parseGroup()
	while (pos < tokens.length) {
		pos++
		clauses.push(...parseGroup())
	}
	return clauses
}

type SimpleToken =
	| { type: 'and' | 'or' | 'not' | 'open' | 'close' }
	| { type: 'phrase'; text: string; slop?: number }
	| { type: 'term'; text: string; fuzzy?: number | 'auto' }

const tokenizeSimple = (text: string): SimpleToken[] => {
	const tokens: SimpleToken[] = []
	let pos = 0

	const readNumber = () => {
		const match = /^\d+/.exec(text.slice(pos))
		if (!match) return undefined
		pos += match[0].length
		return Number(match[0])
	}

	while (pos < text.length) {
		const char = text[pos]!
		if (/\s/.test(char)) {
			pos++
		} else if (char === '+') {
			tokens.push({ type: 'and' })
			pos++
		} else if (char === '|') {
			tokens.push({ type: 'or' })
			pos++
		} else if (char === '-' && (pos === 0 || /[\s(]/.test(text[pos - 1]!))) {
			tokens.push({ type: 'not' })
			pos++
		} else if (char === '(') {
			tokens.push({ type: 'open' })
			pos++
		} else if (char === ')') {
			tokens.push({ type: 'close' })
			pos++
		} else if (char === '"') {
			pos++
			let phrase = ''
			while (pos < text.length && text[pos] !== '"') {
				if (text[pos] === '\\' && pos + 1 < text.length) pos++
				phrase += text[pos]
				pos++
			}
			pos++
			let slop: number | undefined
			if (text[pos] === '~') {
				pos++
				slop = readNumber() ?? 0
			}
			tokens.push({ type: 'phrase', text: phrase, slop })
		} else {
			let term = ''
			while (pos < text.length && !/[\s+|()"~]/.test(text[pos]!)) {
				if (text[pos] === '\\' && pos + 1 < text.length) pos++
				term += text[pos]
				pos++
			}
			let fuzzy: number | 'auto' | undefined
			if (text[pos] === '~') {
				pos++
				const n = readNumber()
				fuzzy = n === undefined ? 'auto' : Math.min(2, n)
			}
			if (term.length > 0) tokens.push({ type: 'term', text: term, fuzzy })
		}
	}

	return tokens
}
