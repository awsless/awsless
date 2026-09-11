import { RedisError } from '../errors'
import { array, error, NIL_ARRAY, OK, Reply } from '../reply'
import type { CommandDef, Context } from '../types'

const unwatch = (ctx: Context) => {
	ctx.conn.watches = []
}

const isDirty = (ctx: Context) =>
	ctx.conn.watches.some(watch => {
		const db = ctx.engine.databases[watch.db]

		if (!db) {
			return true
		}

		// Reading through the store expires the key, which bumps its version.
		db.get(watch.key, ctx.now)

		return db.generation !== watch.generation || db.version(watch.key) !== watch.version
	})

export const commands: CommandDef[] = [
	{
		name: 'MULTI',
		arity: 1,
		noscript: true,
		handler: ctx => {
			if (ctx.conn.multi) {
				throw new RedisError('ERR MULTI calls can not be nested')
			}

			ctx.conn.multi = { queue: [], failed: false }
			return OK
		},
	},
	{
		name: 'EXEC',
		arity: 1,
		noscript: true,
		handler: ctx => {
			const multi = ctx.conn.multi

			if (!multi) {
				throw new RedisError('ERR EXEC without MULTI')
			}

			ctx.conn.multi = null

			if (multi.failed) {
				unwatch(ctx)
				throw new RedisError('EXECABORT Transaction discarded because of previous errors.')
			}

			if (isDirty(ctx)) {
				unwatch(ctx)
				return NIL_ARRAY
			}

			unwatch(ctx)

			const replies: Reply[] = multi.queue.map(argv => {
				try {
					return ctx.engine.call(argv, ctx.conn)
				} catch (err) {
					if (err instanceof RedisError) {
						return error(err.message)
					}

					throw err
				}
			})

			return array(replies)
		},
	},
	{
		name: 'DISCARD',
		arity: 1,
		noscript: true,
		handler: ctx => {
			if (!ctx.conn.multi) {
				throw new RedisError('ERR DISCARD without MULTI')
			}

			ctx.conn.multi = null
			unwatch(ctx)

			return OK
		},
	},
	{
		name: 'WATCH',
		arity: -2,
		noscript: true,
		handler: (ctx, args) => {
			if (ctx.conn.multi) {
				throw new RedisError('ERR WATCH inside MULTI is not allowed')
			}

			for (const key of args) {
				ctx.db.get(key, ctx.now)
				ctx.conn.watches.push({
					db: ctx.conn.db,
					key,
					version: ctx.db.version(key),
					generation: ctx.db.generation,
				})
			}

			return OK
		},
	},
	{
		name: 'UNWATCH',
		arity: 1,
		noscript: true,
		handler: ctx => {
			unwatch(ctx)
			return OK
		},
	},
]
