import { illegalArgument, unsupported } from '../errors'

// A small subset of Painless, enough for the expressions apps put in
// script sorts: doc['field'] access, params, method calls like contains,
// arithmetic, comparisons, boolean logic and the ternary. Anything else
// fails with an error naming the construct, never a wrong answer.

export type ScriptValue = number | string | boolean | null | ScriptValue[] | DocField | ParamsBag

// doc['field']: the values of one field on the current document.
export class DocField {
	constructor(readonly values: Array<number | string | boolean>) {}
}

class ParamsBag {
	constructor(readonly params: Record<string, unknown>) {}
}

export type ScriptScope = {
	field: (name: string) => Array<number | string | boolean>
	params: Record<string, unknown>
}

export type CompiledScript = (scope: ScriptScope) => ScriptValue

type Token =
	| { kind: 'number'; value: number }
	| { kind: 'string'; value: string }
	| { kind: 'name'; value: string }
	| { kind: 'op'; value: string }
	| { kind: 'end' }

const OPERATORS = [
	'&&',
	'||',
	'==',
	'!=',
	'<=',
	'>=',
	'?',
	':',
	'!',
	'<',
	'>',
	'+',
	'-',
	'*',
	'/',
	'%',
	'(',
	')',
	'[',
	']',
	'.',
	',',
	';',
]

// Valid Painless that the subset leaves out, named in the error instead
// of surfacing as a confusing parse failure.
const REJECTED_BEFORE = [
	'<<<',
	'>>>',
	'<<',
	'>>',
	'++',
	'--',
	'+=',
	'-=',
	'*=',
	'/=',
	'%=',
	'===',
	'!==',
	'?:',
	'->',
	'::',
]
const REJECTED_AFTER = ['&', '|', '^', '~', '=', '{', '}']

const tokenize = (source: string): Token[] => {
	const tokens: Token[] = []
	let i = 0

	while (i < source.length) {
		const char = source[i]!

		if (/\s/.test(char)) {
			i++
			continue
		}

		if (/[0-9]/.test(char) || (char === '.' && /[0-9]/.test(source[i + 1] ?? ''))) {
			const match = /^[0-9]*\.?[0-9]+(?:[eE][+-]?[0-9]+)?[lLfFdD]?/.exec(source.slice(i))!
			tokens.push({ kind: 'number', value: Number.parseFloat(match[0].replace(/[lLfFdD]$/, '')) })
			i += match[0].length
			continue
		}

		if (char === "'" || char === '"') {
			let j = i + 1
			let text = ''
			while (j < source.length && source[j] !== char) {
				if (source[j] === '\\') {
					j++
				}
				text += source[j]
				j++
			}
			if (j >= source.length) throw illegalArgument(`Unterminated string in script: ${source}`)
			tokens.push({ kind: 'string', value: text })
			i = j + 1
			continue
		}

		if (/[A-Za-z_$]/.test(char)) {
			const match = /^[A-Za-z_$][A-Za-z0-9_$]*/.exec(source.slice(i))!
			tokens.push({ kind: 'name', value: match[0] })
			i += match[0].length
			continue
		}

		const rejected =
			REJECTED_BEFORE.find(candidate => source.startsWith(candidate, i)) ??
			(OPERATORS.some(candidate => source.startsWith(candidate, i))
				? undefined
				: REJECTED_AFTER.find(candidate => source.startsWith(candidate, i)))
		if (rejected) throw unsupported(`the "${rejected}" operator in scripts`)

		const op = OPERATORS.find(candidate => source.startsWith(candidate, i))
		if (!op) throw unsupported(`the "${char}" character in scripts`)
		tokens.push({ kind: 'op', value: op })
		i += op.length
	}

	tokens.push({ kind: 'end' })
	return tokens
}

type Node = (scope: ScriptScope) => ScriptValue

const truthy = (value: ScriptValue): boolean => {
	if (typeof value !== 'boolean') throw illegalArgument('Script conditions must evaluate to a boolean')
	return value
}

const number = (value: ScriptValue, what: string): number => {
	if (typeof value === 'number') return value
	if (typeof value === 'boolean') return value ? 1 : 0
	throw illegalArgument(`Script operator ${what} needs numbers, got ${describe(value)}`)
}

const describe = (value: ScriptValue): string => {
	if (value === null) return 'null'
	if (value instanceof DocField) return 'doc field'
	if (value instanceof ParamsBag) return 'params'
	if (Array.isArray(value)) return 'list'
	return typeof value
}

const equal = (a: ScriptValue, b: ScriptValue): boolean => {
	if (a instanceof DocField || b instanceof DocField) {
		throw illegalArgument("Compare doc['field'].value, not the field itself")
	}
	return a === b
}

const contains = (list: ScriptValue[], value: ScriptValue) => list.some(entry => equal(entry, value))

// The members and methods a value answers to.
const member = (target: ScriptValue, name: string, args: ScriptValue[] | undefined, source: string): ScriptValue => {
	if (target instanceof ParamsBag) {
		if (args) throw unsupported(`calling "${name}" on params`)
		const value = target.params[name]
		return value === undefined ? null : (value as ScriptValue)
	}

	if (target instanceof DocField) {
		switch (name) {
			case 'value':
				if (args) break
				return target.values[0] ?? null
			case 'values':
				if (args) break
				return target.values
			case 'length':
			case 'size':
				return target.values.length
			case 'empty':
			case 'isEmpty':
				return target.values.length === 0
			case 'contains':
				if (args?.length !== 1) break
				return contains(target.values, args[0]!)
		}
		throw unsupported(`"${name}" on a doc field in scripts (${source})`)
	}

	if (Array.isArray(target)) {
		switch (name) {
			case 'length':
			case 'size':
				return target.length
			case 'empty':
			case 'isEmpty':
				return target.length === 0
			case 'contains':
				if (args?.length !== 1) break
				return contains(target, args[0]!)
		}
		throw unsupported(`"${name}" on a list in scripts (${source})`)
	}

	if (typeof target === 'string') {
		switch (name) {
			case 'length':
				return target.length
			case 'isEmpty':
			case 'empty':
				return target.length === 0
			case 'toLowerCase':
				return target.toLowerCase()
			case 'toUpperCase':
				return target.toUpperCase()
			case 'contains':
			case 'startsWith':
			case 'endsWith':
			case 'equals':
				if (args?.length !== 1 || typeof args[0] !== 'string') break
				if (name === 'equals') return target === args[0]
				if (name === 'contains') return target.includes(args[0])
				return name === 'startsWith' ? target.startsWith(args[0]) : target.endsWith(args[0])
		}
		throw unsupported(`"${name}" on a string in scripts (${source})`)
	}

	if (target === null) throw illegalArgument(`Cannot access "${name}" on null in script: ${source}`)

	throw unsupported(`"${name}" on a ${describe(target)} in scripts (${source})`)
}

const mathFunction = (name: string, args: number[]): number => {
	switch (name) {
		case 'max':
			return Math.max(...args)
		case 'min':
			return Math.min(...args)
		case 'abs':
			return Math.abs(args[0]!)
		case 'floor':
			return Math.floor(args[0]!)
		case 'ceil':
			return Math.ceil(args[0]!)
		case 'round':
			return Math.round(args[0]!)
		case 'sqrt':
			return Math.sqrt(args[0]!)
		case 'pow':
			return Math.pow(args[0]!, args[1]!)
		case 'log':
			return Math.log(args[0]!)
	}
	throw unsupported(`"Math.${name}" in scripts`)
}

class Parser {
	private pos = 0

	constructor(
		private readonly tokens: Token[],
		private readonly source: string
	) {}

	parse(): Node {
		// One expression, optionally written as a return statement.
		if (this.isName('return')) this.pos++
		const node = this.ternary()
		if (this.isOp(';')) this.pos++
		if (this.peek().kind !== 'end') {
			throw unsupported(`multi-statement scripts (${this.source})`)
		}
		return node
	}

	private peek() {
		return this.tokens[this.pos]!
	}

	private isOp(value: string) {
		const token = this.peek()
		return token.kind === 'op' && token.value === value
	}

	private isName(value: string) {
		const token = this.peek()
		return token.kind === 'name' && token.value === value
	}

	private expectOp(value: string) {
		if (!this.isOp(value)) throw illegalArgument(`Expected "${value}" in script: ${this.source}`)
		this.pos++
	}

	private ternary(): Node {
		const condition = this.or()
		if (!this.isOp('?')) return condition
		this.pos++
		const whenTrue = this.ternary()
		this.expectOp(':')
		const whenFalse = this.ternary()
		return scope => (truthy(condition(scope)) ? whenTrue(scope) : whenFalse(scope))
	}

	private or(): Node {
		let left = this.and()
		while (this.isOp('||')) {
			this.pos++
			const right = this.and()
			const current = left
			left = scope => truthy(current(scope)) || truthy(right(scope))
		}
		return left
	}

	private and(): Node {
		let left = this.equality()
		while (this.isOp('&&')) {
			this.pos++
			const right = this.equality()
			const current = left
			left = scope => truthy(current(scope)) && truthy(right(scope))
		}
		return left
	}

	private equality(): Node {
		let left = this.relational()
		while (this.isOp('==') || this.isOp('!=')) {
			const op = (this.peek() as { value: string }).value
			this.pos++
			const right = this.relational()
			const current = left
			left = scope => (op === '==') === equal(current(scope), right(scope))
		}
		return left
	}

	private relational(): Node {
		let left = this.additive()
		while (this.isOp('<') || this.isOp('<=') || this.isOp('>') || this.isOp('>=')) {
			const op = (this.peek() as { value: string }).value
			this.pos++
			const right = this.additive()
			const current = left
			left = scope => {
				const a = number(current(scope), op)
				const b = number(right(scope), op)
				return op === '<' ? a < b : op === '<=' ? a <= b : op === '>' ? a > b : a >= b
			}
		}
		return left
	}

	private additive(): Node {
		let left = this.multiplicative()
		while (this.isOp('+') || this.isOp('-')) {
			const op = (this.peek() as { value: string }).value
			this.pos++
			const right = this.multiplicative()
			const current = left
			left = scope => {
				const a = current(scope)
				const b = right(scope)
				// Painless concatenates when either side is a string.
				if (op === '+' && (typeof a === 'string' || typeof b === 'string')) {
					return `${String(a)}${String(b)}`
				}
				return op === '+' ? number(a, op) + number(b, op) : number(a, op) - number(b, op)
			}
		}
		return left
	}

	private multiplicative(): Node {
		let left = this.unary()
		while (this.isOp('*') || this.isOp('/') || this.isOp('%')) {
			const op = (this.peek() as { value: string }).value
			this.pos++
			const right = this.unary()
			const current = left
			left = scope => {
				const a = number(current(scope), op)
				const b = number(right(scope), op)
				return op === '*' ? a * b : op === '/' ? a / b : a % b
			}
		}
		return left
	}

	private unary(): Node {
		if (this.isOp('!')) {
			this.pos++
			const operand = this.unary()
			return scope => !truthy(operand(scope))
		}
		if (this.isOp('-')) {
			this.pos++
			const operand = this.unary()
			return scope => -number(operand(scope), '-')
		}
		return this.postfix()
	}

	private postfix(): Node {
		let node = this.primary()

		while (true) {
			if (this.isOp('.')) {
				this.pos++
				const token = this.peek()
				if (token.kind !== 'name') throw illegalArgument(`Expected a member name in script: ${this.source}`)
				this.pos++
				const name = token.value
				const args = this.isOp('(') ? this.arguments() : undefined
				const target = node
				node = scope =>
					member(
						target(scope),
						name,
						args?.map(arg => arg(scope)),
						this.source
					)
				continue
			}

			if (this.isOp('[')) {
				this.pos++
				const key = this.ternary()
				this.expectOp(']')
				const target = node
				node = scope => index(target(scope), key(scope), this.source)
				continue
			}

			break
		}

		return node
	}

	private arguments(): Node[] {
		this.expectOp('(')
		const args: Node[] = []
		if (!this.isOp(')')) {
			args.push(this.ternary())
			while (this.isOp(',')) {
				this.pos++
				args.push(this.ternary())
			}
		}
		this.expectOp(')')
		return args
	}

	private primary(): Node {
		const token = this.peek()

		if (token.kind === 'number') {
			this.pos++
			return () => token.value
		}

		if (token.kind === 'string') {
			this.pos++
			return () => token.value
		}

		if (token.kind === 'op' && token.value === '(') {
			this.pos++
			const inner = this.ternary()
			this.expectOp(')')
			return inner
		}

		if (token.kind === 'name') {
			this.pos++
			switch (token.value) {
				case 'true':
					return () => true
				case 'false':
					return () => false
				case 'null':
					return () => null
				case 'params':
					return scope => new ParamsBag(scope.params)
				case 'doc': {
					// doc['field'] - the only shape doc takes in a script.
					this.expectOp('[')
					const key = this.ternary()
					this.expectOp(']')
					return scope => {
						const name = key(scope)
						if (typeof name !== 'string')
							throw illegalArgument(`doc[] needs a field name in script: ${this.source}`)
						return new DocField(scope.field(name))
					}
				}
				case 'Math': {
					this.expectOp('.')
					const name = this.peek()
					if (name.kind !== 'name')
						throw illegalArgument(`Expected a Math function in script: ${this.source}`)
					this.pos++
					const args = this.arguments()
					return scope =>
						mathFunction(
							name.value,
							args.map(arg => number(arg(scope), `Math.${name.value}`))
						)
				}
			}
			throw unsupported(`the "${token.value}" identifier in scripts (${this.source})`)
		}

		throw illegalArgument(`Unexpected token in script: ${this.source}`)
	}
}

const index = (target: ScriptValue, key: ScriptValue, source: string): ScriptValue => {
	if (Array.isArray(target)) {
		if (typeof key !== 'number') throw illegalArgument(`List index must be a number in script: ${source}`)
		return target[key] ?? null
	}
	if (target instanceof ParamsBag) {
		if (typeof key !== 'string') throw illegalArgument(`params key must be a string in script: ${source}`)
		const value = target.params[key]
		return value === undefined ? null : (value as ScriptValue)
	}
	throw unsupported(`indexing a ${describe(target)} in scripts (${source})`)
}

const cache = new Map<string, CompiledScript>()

export const compileScript = (source: string): CompiledScript => {
	const cached = cache.get(source)
	if (cached) return cached

	const parser = new Parser(tokenize(source), source)
	const node = parser.parse()

	cache.set(source, node)
	return node
}
