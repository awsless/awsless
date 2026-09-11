import { RedisEngine } from '../src/engine/engine'
import { toResp2, type Reply } from '../src/engine/reply'
import type { Connection } from '../src/engine/types'

export type Plain = string | number | bigint | null | Error | Plain[]

// Flattens a reply into plain JS so assertions read naturally.
export const plain = (input: Reply): Plain => {
	const reply = toResp2(input)

	switch (reply.type) {
		case 'status':
		case 'bulk':
			return reply.value
		case 'error':
			return new Error(reply.value)
		case 'int':
			return typeof reply.value === 'bigint' && reply.value <= BigInt(Number.MAX_SAFE_INTEGER)
				? Number(reply.value)
				: reply.value
		case 'array':
			return reply.value === null ? null : reply.value.map(plain)
		default:
			return null
	}
}

export const createEngine = (options: { databases?: number } = {}) => {
	let now = 1_700_000_000_000
	const engine = new RedisEngine({ ...options, now: () => now })
	const pushes: Plain[] = []
	const conn = engine.createConnection(reply => pushes.push(plain(reply)))

	const run = (...args: string[]) => plain(engine.execute(args, conn))
	const client = (target: Connection = conn) => ({
		conn: target,
		run: (...args: string[]) => plain(engine.execute(args, target)),
	})

	return {
		engine,
		conn,
		run,
		client,
		pushes,
		newClient: () => {
			const messages: Plain[] = []
			const c = engine.createConnection(reply => messages.push(plain(reply)))
			return { ...client(c), messages }
		},
		advance: (ms: number) => {
			now += ms
		},
		get now() {
			return now
		},
	}
}

export const err = (message: string) => expect.objectContaining({ message })
