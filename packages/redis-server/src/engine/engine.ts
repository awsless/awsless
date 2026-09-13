import { commands as connectionCommands } from './commands/connection'
import { commands as hashCommands } from './commands/hash'
import { commands as keyCommands } from './commands/key'
import { commands as listCommands } from './commands/list'
import { commands as pubsubCommands } from './commands/pubsub'
import { commands as scriptCommands } from './commands/script'
import { commands as serverCommands } from './commands/server'
import { commands as setCommands } from './commands/set'
import { commands as stringCommands } from './commands/string'
import { commands as transactionCommands } from './commands/transaction'
import { commands as zsetCommands } from './commands/zset'
import { arityError, RedisError } from './errors'
import { globMatch } from './glob'
import { LuaRuntime } from './lua'
import { bulk, error, push, Reply, status } from './reply'
import { Database } from './store'
import type { CommandDef, Connection } from './types'

export type RedisEngineOptions = {
	databases?: number
	// Injectable so expiry can be tested without waiting.
	now?: () => number
}

const MULTI_PASSTHROUGH = new Set(['EXEC', 'DISCARD', 'MULTI', 'WATCH', 'QUIT', 'RESET'])
const SUBSCRIBED_ALLOWED = new Set([
	'SUBSCRIBE',
	'UNSUBSCRIBE',
	'PSUBSCRIBE',
	'PUNSUBSCRIBE',
	'SSUBSCRIBE',
	'SUNSUBSCRIBE',
	'PING',
	'QUIT',
	'RESET',
])

const toByteString = (value: string | Buffer) => (typeof value === 'string' ? value : value.toString('latin1'))

export class RedisEngine {
	readonly databases: Database[]
	readonly clients = new Set<Connection>()
	readonly channels = new Map<string, Set<Connection>>()
	readonly patterns = new Map<string, Set<Connection>>()
	readonly shards = new Map<string, Set<Connection>>()
	readonly startedAt: number
	// Reported by INFO; the transport fills it in once it is bound.
	port = 0
	readonly runId = Array.from({ length: 40 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('')
	readonly stats = { connections: 0, commands: 0 }

	private commands = new Map<string, CommandDef>()
	private nextClientId = 1
	private clock: () => number
	private sweeper: ReturnType<typeof setInterval> | undefined
	private luaRuntime: LuaRuntime | undefined
	private defaultConnection: Connection | undefined

	constructor(options: RedisEngineOptions = {}) {
		this.clock = options.now ?? Date.now
		this.startedAt = this.clock()
		this.databases = Array.from({ length: options.databases ?? 16 }, (_, i) => new Database(i))

		for (const list of [
			connectionCommands,
			serverCommands,
			keyCommands,
			stringCommands,
			hashCommands,
			listCommands,
			setCommands,
			zsetCommands,
			pubsubCommands,
			transactionCommands,
			scriptCommands,
		]) {
			for (const def of list) {
				this.commands.set(def.name, def)
			}
		}
	}

	get now() {
		return this.clock()
	}

	// The Lua state is expensive to build, so it only exists once a script runs.
	get lua() {
		if (!this.luaRuntime) {
			this.luaRuntime = new LuaRuntime(this)
		}

		return this.luaRuntime
	}

	commandNames() {
		return [...this.commands.keys()]
	}

	createConnection(push: (reply: Reply) => void = () => {}): Connection {
		const conn: Connection = {
			id: this.nextClientId++,
			createdAt: this.now,
			protocol: 2,
			db: 0,
			name: null,
			lib: { name: null, version: null },
			multi: null,
			watches: [],
			subscriptions: { channels: new Set(), patterns: new Set(), shards: new Set() },
			push,
			quit: false,
			script: null,
		}

		this.clients.add(conn)

		return conn
	}

	releaseConnection(conn: Connection) {
		this.unsubscribeAll(conn)
		conn.watches = []
		conn.multi = null
		this.clients.delete(conn)
	}

	// Entry point for the transport: never throws, every failure is a reply.
	execute(args: (string | Buffer)[], conn?: Connection): Reply {
		if (!conn) {
			conn = this.defaultConnection ??= this.createConnection()
		}

		const argv = args.map(toByteString)
		const name = (argv[0] ?? '').toUpperCase()

		if (conn.multi && !MULTI_PASSTHROUGH.has(name)) {
			const def = this.commands.get(name)

			if (!def) {
				conn.multi.failed = true
				return error(this.unknownCommandMessage(argv))
			}

			if (!this.checkArity(def, argv.length)) {
				conn.multi.failed = true
				return error(arityError(def.name).message)
			}

			conn.multi.queue.push(argv)

			return status('QUEUED')
		}

		// RESP3 clients may mix regular commands with subscriptions.
		if (conn.protocol === 2 && this.isSubscribed(conn) && !SUBSCRIBED_ALLOWED.has(name)) {
			return error(
				`ERR Can't execute '${name.toLowerCase()}': only (P|S)SUBSCRIBE / (P|S)UNSUBSCRIBE / PING / QUIT / RESET are allowed in this context`
			)
		}

		try {
			return this.call(argv, conn)
		} catch (err) {
			if (err instanceof RedisError) {
				return error(err.message)
			}

			// An internal bug must still surface as an error to the client
			// instead of tearing down the socket.
			return error(`ERR internal error: ${err instanceof Error ? err.message : String(err)}`)
		}
	}

	// Runs one command and throws on failure. Used by EXEC and Lua, which need
	// the error as a value rather than a reply.
	call(argv: string[], conn: Connection): Reply {
		const name = (argv[0] ?? '').toUpperCase()
		const def = this.commands.get(name)

		if (!def) {
			throw new RedisError(this.unknownCommandMessage(argv))
		}

		if (!this.checkArity(def, argv.length)) {
			throw arityError(def.name)
		}

		if (conn.script) {
			if (def.noscript) {
				throw new RedisError('ERR This Redis command is not allowed from script')
			}

			if (conn.script.readOnly && def.write) {
				throw new RedisError('ERR Write commands are not allowed from read-only scripts.')
			}
		}

		const db = this.databases[conn.db]

		if (!db) {
			throw new RedisError('ERR DB index is out of range')
		}

		return def.handler({ engine: this, conn, db, now: this.now }, argv.slice(1))
	}

	private checkArity(def: CommandDef, count: number) {
		return def.arity < 0 ? count >= -def.arity : count === def.arity
	}

	private unknownCommandMessage(argv: string[]) {
		const rest = argv
			.slice(1)
			.map(a => `'${a}' `)
			.join('')

		return `ERR unknown command '${argv[0] ?? ''}', with args beginning with: ${rest}`
	}

	isSubscribed(conn: Connection) {
		const s = conn.subscriptions
		return s.channels.size > 0 || s.patterns.size > 0 || s.shards.size > 0
	}

	subscriptionCount(conn: Connection) {
		return conn.subscriptions.channels.size + conn.subscriptions.patterns.size
	}

	subscribe(conn: Connection, name: string, kind: 'channels' | 'patterns' | 'shards') {
		conn.subscriptions[kind].add(name)
		const index = kind === 'channels' ? this.channels : kind === 'patterns' ? this.patterns : this.shards
		let set = index.get(name)

		if (!set) {
			set = new Set()
			index.set(name, set)
		}

		set.add(conn)
	}

	unsubscribe(conn: Connection, name: string, kind: 'channels' | 'patterns' | 'shards'): boolean {
		const had = conn.subscriptions[kind].delete(name)
		const index = kind === 'channels' ? this.channels : kind === 'patterns' ? this.patterns : this.shards
		const set = index.get(name)

		if (set) {
			set.delete(conn)

			if (set.size === 0) {
				index.delete(name)
			}
		}

		return had
	}

	unsubscribeAll(conn: Connection) {
		for (const kind of ['channels', 'patterns', 'shards'] as const) {
			for (const name of [...conn.subscriptions[kind]]) {
				this.unsubscribe(conn, name, kind)
			}
		}
	}

	publish(channel: string, message: string): number {
		let count = 0

		for (const conn of this.channels.get(channel) ?? []) {
			conn.push(push([bulk('message'), bulk(channel), bulk(message)]))
			count++
		}

		for (const [pattern, conns] of this.patterns) {
			if (globMatch(pattern, channel)) {
				for (const conn of conns) {
					conn.push(push([bulk('pmessage'), bulk(pattern), bulk(channel), bulk(message)]))
					count++
				}
			}
		}

		return count
	}

	spublish(channel: string, message: string): number {
		let count = 0

		for (const conn of this.shards.get(channel) ?? []) {
			conn.push(push([bulk('smessage'), bulk(channel), bulk(message)]))
			count++
		}

		return count
	}

	flushAll() {
		for (const db of this.databases) {
			db.flush()
		}
	}

	startSweeper(interval = 100) {
		if (this.sweeper) {
			return
		}

		this.sweeper = setInterval(() => {
			const now = this.now

			for (const db of this.databases) {
				db.sweep(now)
			}
		}, interval)

		// Never keep the process alive just to expire keys.
		this.sweeper.unref?.()
	}

	stopSweeper() {
		if (this.sweeper) {
			clearInterval(this.sweeper)
			this.sweeper = undefined
		}
	}

	// Used by INFO and CLIENT LIST; kept here so both agree on the numbers.
	keyspace() {
		return this.databases
			.filter(db => db.size > 0)
			.map(db => ({ index: db.index, keys: db.size, expires: db.expireCount }))
	}
}
