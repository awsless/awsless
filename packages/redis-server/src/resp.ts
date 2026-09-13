import { formatDouble } from './engine/number'
import { toResp2, type Reply } from './engine/reply'

export class ProtocolError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'ProtocolError'
	}
}

const CR = 0x0d
const LF = 0x0a

const findLine = (buffer: Buffer, from: number) => {
	const index = buffer.indexOf(LF, from)

	if (index === -1) {
		return -1
	}

	return index
}

// Splits inline commands the way redis does: whitespace separated with
// optional double or single quoted arguments.
const splitInline = (line: string): string[] => {
	const args: string[] = []
	let i = 0

	while (i < line.length) {
		while (i < line.length && /\s/.test(line[i]!)) {
			i++
		}

		if (i >= line.length) {
			break
		}

		const quote = line[i]

		if (quote === '"' || quote === "'") {
			let value = ''
			i++

			for (;;) {
				const c = line[i]

				if (c === undefined) {
					throw new ProtocolError('unbalanced quotes in request')
				}

				if (c === '\\' && quote === '"' && i + 1 < line.length) {
					const next = line[i + 1]!
					const escapes: Record<string, string> = { n: '\n', r: '\r', t: '\t', b: '\b', a: '\x07' }
					value += escapes[next] ?? next
					i += 2
					continue
				}

				if (c === quote) {
					i++
					break
				}

				value += c
				i++
			}

			args.push(value)
			continue
		}

		let value = ''

		while (i < line.length && !/\s/.test(line[i]!)) {
			value += line[i]
			i++
		}

		args.push(value)
	}

	return args
}

// Accumulates socket chunks and yields complete commands. Arguments come
// back as latin1 strings so every byte survives untouched.
export class RespParser {
	private buffer: Buffer = Buffer.alloc(0)

	push(chunk: Buffer): string[][] {
		this.buffer = this.buffer.length === 0 ? chunk : Buffer.concat([this.buffer, chunk])
		const commands: string[][] = []
		let pos = 0

		while (pos < this.buffer.length) {
			const result = this.buffer[pos] === 0x2a ? this.parseMultiBulk(pos) : this.parseInline(pos)

			if (!result) {
				break
			}

			if (result.args.length > 0) {
				commands.push(result.args)
			}

			pos = result.end
		}

		this.buffer = pos === 0 ? this.buffer : this.buffer.subarray(pos)

		return commands
	}

	private readLine(pos: number): { text: string; end: number } | null {
		const lf = findLine(this.buffer, pos)

		if (lf === -1) {
			return null
		}

		const cr = lf > pos && this.buffer[lf - 1] === CR ? lf - 1 : lf

		return { text: this.buffer.toString('latin1', pos, cr), end: lf + 1 }
	}

	private parseInline(pos: number): { args: string[]; end: number } | null {
		const line = this.readLine(pos)

		if (!line) {
			return null
		}

		return { args: splitInline(line.text), end: line.end }
	}

	private parseMultiBulk(pos: number): { args: string[]; end: number } | null {
		const header = this.readLine(pos)

		if (!header) {
			return null
		}

		const count = Number(header.text.slice(1))

		if (!Number.isInteger(count) || count > 1024 * 1024) {
			throw new ProtocolError('invalid multibulk length')
		}

		let cursor = header.end
		const args: string[] = []

		for (let i = 0; i < count; i++) {
			if (cursor >= this.buffer.length) {
				return null
			}

			if (this.buffer[cursor] !== 0x24) {
				throw new ProtocolError(`expected '$', got '${String.fromCharCode(this.buffer[cursor]!)}'`)
			}

			const line = this.readLine(cursor)

			if (!line) {
				return null
			}

			const length = Number(line.text.slice(1))

			if (!Number.isInteger(length) || length < 0 || length > 512 * 1024 * 1024) {
				throw new ProtocolError('invalid bulk length')
			}

			const start = line.end
			const end = start + length

			if (end + 2 > this.buffer.length) {
				return null
			}

			args.push(this.buffer.toString('latin1', start, end))
			cursor = end + 2
		}

		return { args, end: cursor }
	}
}

const sanitize = (text: string) => text.replace(/[\r\n]+/g, ' ')

const encodeList = (items: Reply[], protocol: Protocol) => items.map(item => encodeReply(item, protocol)).join('')

const encodePairs = (items: [Reply, Reply][], protocol: Protocol) =>
	items.map(([k, v]) => encodeReply(k, protocol) + encodeReply(v, protocol)).join('')

export type Protocol = 2 | 3

export const encodeReply = (reply: Reply, protocol: Protocol = 2): string => {
	switch (reply.type) {
		case 'status':
			return `+${sanitize(reply.value)}\r\n`
		case 'error':
			return `-${sanitize(reply.value)}\r\n`
		case 'int':
			return `:${reply.value}\r\n`
		case 'bulk':
			if (reply.value === null) {
				return protocol === 3 ? '_\r\n' : '$-1\r\n'
			}

			return `$${reply.value.length}\r\n${reply.value}\r\n`
		case 'array':
			if (reply.value === null) {
				return protocol === 3 ? '_\r\n' : '*-1\r\n'
			}

			return `*${reply.value.length}\r\n${encodeList(reply.value, protocol)}`
		case 'double':
			return protocol === 3 ? `,${formatDouble(reply.value)}\r\n` : encodeReply(toResp2(reply), protocol)
		case 'map':
			return protocol === 3
				? `%${reply.value.length}\r\n${encodePairs(reply.value, protocol)}`
				: `*${reply.value.length * 2}\r\n${encodePairs(reply.value, protocol)}`
		case 'pairs':
			return protocol === 3
				? `*${reply.value.length}\r\n${reply.value.map(([k, v]) => `*2\r\n${encodeReply(k, 3)}${encodeReply(v, 3)}`).join('')}`
				: `*${reply.value.length * 2}\r\n${encodePairs(reply.value, protocol)}`
		case 'set':
			return `${protocol === 3 ? '~' : '*'}${reply.value.length}\r\n${encodeList(reply.value, protocol)}`
		case 'push':
			return `${protocol === 3 ? '>' : '*'}${reply.value.length}\r\n${encodeList(reply.value, protocol)}`
		case 'verbatim':
			return protocol === 3
				? `=${reply.value.length + 4}\r\ntxt:${reply.value}\r\n`
				: `$${reply.value.length}\r\n${reply.value}\r\n`
		case 'none':
			return ''
	}
}
