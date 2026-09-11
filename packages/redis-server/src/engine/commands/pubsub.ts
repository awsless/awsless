import { RedisError, unknownSubcommand } from '../errors'
import { globMatch } from '../glob'
import { bulk, bulks, int, map, NONE, push } from '../reply'
import type { CommandDef, Connection, Context, Subscriptions } from '../types'

type Kind = keyof Subscriptions

const labels: Record<Kind, [string, string]> = {
	channels: ['subscribe', 'unsubscribe'],
	patterns: ['psubscribe', 'punsubscribe'],
	shards: ['ssubscribe', 'sunsubscribe'],
}

// Shard subscriptions count separately from the channel+pattern total.
const countFor = (ctx: Context, conn: Connection, kind: Kind) =>
	kind === 'shards' ? conn.subscriptions.shards.size : ctx.engine.subscriptionCount(conn)

const subscribe = (kind: Kind) => (ctx: Context, args: string[]) => {
	for (const name of args) {
		ctx.engine.subscribe(ctx.conn, name, kind)
		ctx.conn.push(push([bulk(labels[kind][0]), bulk(name), int(countFor(ctx, ctx.conn, kind))]))
	}

	return NONE
}

const unsubscribe = (kind: Kind) => (ctx: Context, args: string[]) => {
	const names = args.length > 0 ? args : [...ctx.conn.subscriptions[kind]]

	if (names.length === 0) {
		ctx.conn.push(push([bulk(labels[kind][1]), bulk(null), int(countFor(ctx, ctx.conn, kind))]))
		return NONE
	}

	for (const name of names) {
		ctx.engine.unsubscribe(ctx.conn, name, kind)
		ctx.conn.push(push([bulk(labels[kind][1]), bulk(name), int(countFor(ctx, ctx.conn, kind))]))
	}

	return NONE
}

const pubsub = (ctx: Context, args: string[]) => {
	const sub = args[0]!.toUpperCase()
	const rest = args.slice(1)

	switch (sub) {
		case 'CHANNELS':
		case 'SHARDCHANNELS': {
			if (rest.length > 1) {
				throw new RedisError(`ERR wrong number of arguments for 'pubsub|${sub.toLowerCase()}' command`)
			}

			const pattern = rest[0]
			const index = sub === 'CHANNELS' ? ctx.engine.channels : ctx.engine.shards
			return bulks([...index.keys()].filter(name => pattern === undefined || globMatch(pattern, name)))
		}
		case 'NUMSUB':
		case 'SHARDNUMSUB': {
			const index = sub === 'NUMSUB' ? ctx.engine.channels : ctx.engine.shards
			return map(rest.map(name => [bulk(name), int(index.get(name)?.size ?? 0)]))
		}
		case 'NUMPAT':
			if (rest.length > 0) {
				throw new RedisError("ERR wrong number of arguments for 'pubsub|numpat' command")
			}

			return int(ctx.engine.patterns.size)
		case 'HELP':
			throw new RedisError('ERR the local redis server does not support PUBSUB HELP')
		default:
			throw unknownSubcommand(args[0]!, 'pubsub')
	}
}

export const commands: CommandDef[] = [
	{ name: 'SUBSCRIBE', arity: -2, noscript: true, handler: subscribe('channels') },
	{ name: 'UNSUBSCRIBE', arity: -1, noscript: true, handler: unsubscribe('channels') },
	{ name: 'PSUBSCRIBE', arity: -2, noscript: true, handler: subscribe('patterns') },
	{ name: 'PUNSUBSCRIBE', arity: -1, noscript: true, handler: unsubscribe('patterns') },
	{ name: 'SSUBSCRIBE', arity: -2, noscript: true, handler: subscribe('shards') },
	{ name: 'SUNSUBSCRIBE', arity: -1, noscript: true, handler: unsubscribe('shards') },
	{ name: 'PUBLISH', arity: 3, handler: (ctx, args) => int(ctx.engine.publish(args[0]!, args[1]!)) },
	{ name: 'SPUBLISH', arity: 3, handler: (ctx, args) => int(ctx.engine.spublish(args[0]!, args[1]!)) },
	{ name: 'PUBSUB', arity: -2, handler: pubsub },
]
