import { cannotParseText } from './errors'

// Reads JSON the way ClickHouse's input formats do: one value after the
// other, with or without commas, & an integer past what a double holds
// kept whole as a bigint instead of rounded by JSON.parse.
export const parseJsonSequence = (text: string): unknown[] => {
	const reader = new JsonReader(text)
	const values: unknown[] = []

	while (true) {
		reader.skipSeparators()

		if (reader.done()) {
			return values
		}

		values.push(reader.value())
	}
}

const LITERALS: Record<string, unknown> = { true: true, false: false, null: null }

class JsonReader {
	private pos = 0

	constructor(private readonly text: string) {}

	done() {
		return this.pos >= this.text.length
	}

	skipSeparators() {
		while (this.pos < this.text.length && /[\s,;]/.test(this.text[this.pos]!)) this.pos++
	}

	private skipWhitespace() {
		while (this.pos < this.text.length && /\s/.test(this.text[this.pos]!)) this.pos++
	}

	private fail(expected: string): never {
		const near = this.text.slice(this.pos, this.pos + 40)
		throw cannotParseText(`Cannot parse input: expected ${expected} before: '${near}'`)
	}

	value(): unknown {
		this.skipWhitespace()

		const char = this.text[this.pos]

		if (char === undefined) this.fail('a value')
		if (char === '{') return this.object()
		if (char === '[') return this.array()
		if (char === '"') return this.string()

		const literal = /^(true|false|null)\b/.exec(this.text.slice(this.pos, this.pos + 5))

		if (literal) {
			this.pos += literal[1]!.length
			return LITERALS[literal[1]!]
		}

		return this.number()
	}

	private object() {
		const object: Record<string, unknown> = {}
		this.pos++

		while (true) {
			this.skipWhitespace()

			if (this.text[this.pos] === '}') {
				this.pos++
				return object
			}

			if (this.text[this.pos] !== '"') this.fail("'\"'")

			const key = this.string()
			this.skipWhitespace()

			if (this.text[this.pos] !== ':') this.fail("':'")

			this.pos++
			object[key] = this.value()
			this.skipWhitespace()

			if (this.text[this.pos] === ',') this.pos++
			else if (this.text[this.pos] !== '}') this.fail("',' or '}'")
		}
	}

	private array() {
		const items: unknown[] = []
		this.pos++

		while (true) {
			this.skipWhitespace()

			if (this.text[this.pos] === ']') {
				this.pos++
				return items
			}

			items.push(this.value())
			this.skipWhitespace()

			if (this.text[this.pos] === ',') this.pos++
			else if (this.text[this.pos] !== ']') this.fail("',' or ']'")
		}
	}

	// The string token as JSON.parse reads it, escapes included.
	private string(): string {
		const start = this.pos
		this.pos++

		while (this.pos < this.text.length) {
			const char = this.text[this.pos]!

			if (char === '\\') this.pos += 2
			else if (char === '"') {
				this.pos++
				return JSON.parse(this.text.slice(start, this.pos))
			} else this.pos++
		}

		this.fail("'\"'")
	}

	private number(): number | bigint {
		const match = /^-?(?:0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/.exec(this.text.slice(this.pos))

		if (!match) this.fail('a value')

		this.pos += match[0].length

		if (!match[1] && !match[2] && match[0].replace('-', '').length > 15) {
			const big = BigInt(match[0])
			return big >= BigInt(Number.MIN_SAFE_INTEGER) && big <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(big) : big
		}

		return Number(match[0])
	}
}
