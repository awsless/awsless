import { RedisError, syntaxError, unknownSubcommand, unsupported } from '../errors'
import { parseInteger } from '../number'
import { array, bulk, int, map, OK, status } from '../reply'
import type { CommandDef, Connection, Context } from '../types'
import { REDIS_VERSION } from './server'
import { expectArg } from './util'

// One CLIENT LIST line, close enough to redis for dashboards that parse it.
export const describeClient = (ctx: Context, conn: Connection) => {
	const age = Math.floor((ctx.now - conn.createdAt) / 1000)

	return [
		`id=${conn.id}`,
		'addr=127.0.0.1:0',
		`laddr=127.0.0.1:${ctx.engine.port}`,
		'fd=0',
		`name=${conn.name ?? ''}`,
		`age=${age}`,
		'idle=0',
		`flags=${ctx.engine.isSubscribed(conn) ? 'P' : conn.multi ? 'x' : 'N'}`,
		`db=${conn.db}`,
		`sub=${conn.subscriptions.channels.size}`,
		`psub=${conn.subscriptions.patterns.size}`,
		`ssub=${conn.subscriptions.shards.size}`,
		`multi=${conn.multi ? conn.multi.queue.length : -1}`,
		'qbuf=0 qbuf-free=0 argv-mem=0 multi-mem=0 rbs=0 rbp=0 obl=0 oll=0 omem=0 tot-mem=0 events=r',
		`cmd=client|list user=default redir=-1 resp=${conn.protocol}`,
		`lib-name=${conn.lib.name ?? ''}`,
		`lib-ver=${conn.lib.version ?? ''}`,
	].join(' ')
}

const validName = (name: string) => {
	for (let i = 0; i < name.length; i++) {
		const code = name.charCodeAt(i)

		if (code <= 0x20 || code === 0x7f) {
			return false
		}
	}

	return true
}

const client = (ctx: Context, args: string[]) => {
	const sub = args[0]!.toUpperCase()

	switch (sub) {
		case 'ID':
			return int(ctx.conn.id)
		case 'GETNAME':
			return bulk(ctx.conn.name)
		case 'SETNAME': {
			const name = expectArg(args, 1)

			if (!validName(name)) {
				throw new RedisError('ERR Client names cannot contain spaces, newlines or special characters.')
			}

			ctx.conn.name = name === '' ? null : name
			return OK
		}
		case 'SETINFO': {
			const attr = expectArg(args, 1).toUpperCase()
			const value = expectArg(args, 2)

			if (!validName(value)) {
				throw new RedisError(`ERR ${attr.toLowerCase()} cannot contain spaces, newlines or special characters.`)
			}

			if (attr === 'LIB-NAME') ctx.conn.lib.name = value
			else if (attr === 'LIB-VER') ctx.conn.lib.version = value
			else throw new RedisError(`ERR Unrecognized option '${args[1]}'`)

			return OK
		}
		case 'LIST':
			return bulk([...ctx.engine.clients].map(c => describeClient(ctx, c)).join('\n') + '\n')
		case 'INFO':
			return bulk(describeClient(ctx, ctx.conn) + '\n')
		case 'KILL':
		case 'PAUSE':
		case 'UNPAUSE':
		case 'REPLY':
		case 'TRACKING':
		case 'CACHING':
		case 'NO-EVICT':
		case 'NO-TOUCH':
		case 'UNBLOCK':
		case 'GETREDIR':
		case 'HELP':
			throw unsupported(`CLIENT ${sub}`)
		default:
			throw unknownSubcommand(args[0]!, 'client')
	}
}

export const resetConnection = (ctx: Context) => {
	ctx.engine.unsubscribeAll(ctx.conn)
	ctx.conn.watches = []
	ctx.conn.multi = null
	ctx.conn.db = 0
	ctx.conn.name = null
	ctx.conn.protocol = 2
}

const hello = (ctx: Context, args: string[]) => {
	if (args.length > 0) {
		const version = parseInteger(
			args[0]!,
			() => new RedisError('ERR Protocol version is not an integer or out of range')
		)

		if (version !== 2 && version !== 3) {
			throw new RedisError('NOPROTO unsupported protocol version')
		}

		for (let i = 1; i < args.length; i++) {
			const option = args[i]!.toUpperCase()

			if (option === 'AUTH') {
				expectArg(args, i + 1)
				expectArg(args, i + 2)
				i += 2
			} else if (option === 'SETNAME') {
				const name = expectArg(args, ++i)

				if (!validName(name)) {
					throw new RedisError('ERR Client names cannot contain spaces, newlines or special characters.')
				}

				ctx.conn.name = name
			} else {
				throw syntaxError()
			}
		}

		ctx.conn.protocol = version
	}

	return map([
		[bulk('server'), bulk('redis')],
		[bulk('version'), bulk(REDIS_VERSION)],
		[bulk('proto'), int(ctx.conn.protocol)],
		[bulk('id'), int(ctx.conn.id)],
		[bulk('mode'), bulk('standalone')],
		[bulk('role'), bulk('master')],
		[bulk('modules'), array([])],
	])
}

export const commands: CommandDef[] = [
	{
		name: 'PING',
		arity: -1,
		handler: (ctx, args) => {
			if (args.length > 1) {
				throw new RedisError("ERR wrong number of arguments for 'ping' command")
			}

			// Only RESP2 needs the array form to tell a pong from a message.
			if (ctx.conn.protocol === 2 && ctx.engine.isSubscribed(ctx.conn)) {
				return array([bulk('pong'), bulk(args[0] ?? '')])
			}

			return args[0] === undefined ? status('PONG') : bulk(args[0])
		},
	},
	{ name: 'ECHO', arity: 2, handler: (_, args) => bulk(args[0]!) },
	{ name: 'HELLO', arity: -1, noscript: true, handler: hello },
	{
		name: 'SELECT',
		arity: 2,
		handler: (ctx, args) => {
			const index = parseInteger(args[0]!, () => new RedisError('ERR value is not an integer or out of range'))

			if (index < 0 || index >= ctx.engine.databases.length) {
				throw new RedisError('ERR DB index is out of range')
			}

			ctx.conn.db = index
			return OK
		},
	},
	// No ACL exists here, so any credentials are accepted.
	{ name: 'AUTH', arity: -2, noscript: true, handler: () => OK },
	{ name: 'CLIENT', arity: -2, noscript: true, handler: client },
	{
		name: 'QUIT',
		arity: -1,
		noscript: true,
		handler: ctx => {
			ctx.conn.quit = true
			return OK
		},
	},
	{
		name: 'RESET',
		arity: 1,
		noscript: true,
		handler: ctx => {
			resetConnection(ctx)
			return status('RESET')
		},
	},
	{ name: 'READONLY', arity: 1, handler: () => OK },
	{ name: 'READWRITE', arity: 1, handler: () => OK },
]
