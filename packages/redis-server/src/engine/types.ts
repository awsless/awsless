import type { RedisEngine } from './engine'
import type { Reply } from './reply'
import type { Database } from './store'

export type Watch = { db: number; key: string; version: number; generation: number }

export type Subscriptions = {
	channels: Set<string>
	patterns: Set<string>
	shards: Set<string>
}

// Everything the engine needs to know about one client. The transport owns
// the socket; the engine only ever sees this record.
export type Connection = {
	readonly id: number
	readonly createdAt: number
	protocol: 2 | 3
	db: number
	name: string | null
	lib: { name: string | null; version: string | null }
	multi: { queue: string[][]; failed: boolean } | null
	watches: Watch[]
	subscriptions: Subscriptions
	push: (reply: Reply) => void
	quit: boolean
	// Set while a Lua script runs, so commands that redis forbids in scripts
	// (and writes inside EVAL_RO) can be rejected.
	script: { readOnly: boolean } | null
}

export type Context = {
	engine: RedisEngine
	conn: Connection
	db: Database
	now: number
}

export type Handler = (ctx: Context, args: string[]) => Reply

// Arity follows redis: it counts the command name, negative means "at least".
export type CommandDef = {
	name: string
	arity: number
	handler: Handler
	write?: boolean
	noscript?: boolean
}
