import { RedisError, syntaxError, unknownSubcommand, unsupported } from '../errors'
import { globMatch } from '../glob'
import { parseInteger } from '../number'
import { array, bulk, bulks, int, map, OK, status, verbatim } from '../reply'
import type { Reply } from '../reply'
import type { CommandDef, Context } from '../types'

export const REDIS_VERSION = '7.2.4'

const platform = () => {
	const p = (globalThis as { process?: { platform?: string; arch?: string; version?: string } }).process
	return { os: `${p?.platform ?? 'unknown'} ${p?.arch ?? ''}`.trim(), runtime: p?.version ?? '' }
}

type Section = { name: string; lines: () => string[] }

const sections = (ctx: Context): Section[] => {
	const { os, runtime } = platform()
	const uptime = Math.floor((ctx.now - ctx.engine.startedAt) / 1000)

	return [
		{
			name: 'server',
			lines: () => [
				`redis_version:${REDIS_VERSION}`,
				'redis_git_sha1:00000000',
				'redis_git_dirty:0',
				'redis_build_id:awsless-redis-server',
				'redis_mode:standalone',
				`os:${os}`,
				'arch_bits:64',
				`multiplexing_api:node ${runtime}`,
				`process_id:${(globalThis as { process?: { pid?: number } }).process?.pid ?? 0}`,
				`run_id:${ctx.engine.runId}`,
				`tcp_port:${ctx.engine.port}`,
				`server_time_usec:${ctx.now * 1000}`,
				`uptime_in_seconds:${uptime}`,
				`uptime_in_days:${Math.floor(uptime / 86400)}`,
				'hz:10',
				'configured_hz:10',
				'executable:@awsless/redis-server',
				'config_file:',
			],
		},
		{
			name: 'clients',
			lines: () => [
				`connected_clients:${ctx.engine.clients.size}`,
				'cluster_connections:0',
				'maxclients:10000',
				'client_recent_max_input_buffer:0',
				'client_recent_max_output_buffer:0',
				'blocked_clients:0',
				'tracking_clients:0',
				`pubsub_clients:${[...ctx.engine.clients].filter(c => ctx.engine.isSubscribed(c)).length}`,
				'clients_in_timeout_table:0',
			],
		},
		{
			name: 'memory',
			lines: () => {
				const used =
					(globalThis as { process?: { memoryUsage?: () => { heapUsed: number } } }).process?.memoryUsage?.()
						.heapUsed ?? 0
				return [
					`used_memory:${used}`,
					`used_memory_human:${(used / 1024 / 1024).toFixed(2)}M`,
					`used_memory_rss:${used}`,
					`used_memory_peak:${used}`,
					`used_memory_peak_human:${(used / 1024 / 1024).toFixed(2)}M`,
					'maxmemory:0',
					'maxmemory_human:0B',
					'maxmemory_policy:noeviction',
					'mem_fragmentation_ratio:1.00',
					'mem_allocator:js',
				]
			},
		},
		{
			name: 'persistence',
			lines: () => [
				'loading:0',
				'rdb_changes_since_last_save:0',
				'rdb_bgsave_in_progress:0',
				`rdb_last_save_time:${Math.floor(ctx.now / 1000)}`,
				'aof_enabled:0',
			],
		},
		{
			name: 'stats',
			lines: () => [
				`total_connections_received:${ctx.engine.stats.connections}`,
				`total_commands_processed:${ctx.engine.stats.commands}`,
				'instantaneous_ops_per_sec:0',
				'rejected_connections:0',
				'evicted_keys:0',
				`pubsub_channels:${ctx.engine.channels.size}`,
				`pubsub_patterns:${ctx.engine.patterns.size}`,
				`pubsubshard_channels:${ctx.engine.shards.size}`,
			],
		},
		{
			name: 'replication',
			lines: () => [
				'role:master',
				'connected_slaves:0',
				'master_failover_state:no-failover',
				`master_replid:${ctx.engine.runId}`,
				'master_repl_offset:0',
			],
		},
		{ name: 'cpu', lines: () => ['used_cpu_sys:0.000000', 'used_cpu_user:0.000000'] },
		{ name: 'cluster', lines: () => ['cluster_enabled:0'] },
		{
			name: 'keyspace',
			// Dashboards parse `^db(\d+):` so this line format is load bearing.
			lines: () =>
				ctx.engine.keyspace().map(db => `db${db.index}:keys=${db.keys},expires=${db.expires},avg_ttl=0`),
		},
	]
}

const info = (ctx: Context, args: string[]) => {
	const requested = new Set(args.map(a => a.toLowerCase()))
	const everything = requested.has('all') || requested.has('everything')
	const all = requested.size === 0 || requested.has('default') || everything
	const out: string[] = []

	for (const section of sections(ctx)) {
		if (all || requested.has(section.name)) {
			out.push(`# ${section.name[0]!.toUpperCase()}${section.name.slice(1)}`, ...section.lines(), '')
		}
	}

	return verbatim(out.join('\r\n'))
}

const config = (ctx: Context, args: string[]) => {
	const sub = args[0]!.toUpperCase()

	if (sub === 'GET') {
		if (args.length < 2) {
			throw new RedisError("ERR wrong number of arguments for 'config|get' command")
		}

		const known: Record<string, string> = {
			databases: String(ctx.engine.databases.length),
			maxmemory: '0',
			'maxmemory-policy': 'noeviction',
			port: String(ctx.engine.port),
			bind: '127.0.0.1',
			timeout: '0',
			'notify-keyspace-events': '',
			appendonly: 'no',
			save: '',
		}
		const out: [Reply, Reply][] = []

		for (const [name, value] of Object.entries(known)) {
			if (args.slice(1).some(pattern => globMatch(pattern.toLowerCase(), name))) {
				out.push([bulk(name), bulk(value)])
			}
		}

		return map(out)
	}

	if (sub === 'SET' || sub === 'RESETSTAT' || sub === 'REWRITE') {
		throw unsupported(`CONFIG ${sub}`)
	}

	throw unknownSubcommand(args[0]!, 'config')
}

const parseFlushMode = (args: string[]) => {
	if (args.length > 1) {
		throw syntaxError()
	}

	const mode = args[0]?.toUpperCase()

	if (mode !== undefined && mode !== 'ASYNC' && mode !== 'SYNC') {
		throw syntaxError()
	}
}

export const commands: CommandDef[] = [
	{ name: 'INFO', arity: -1, handler: info },
	{
		name: 'COMMAND',
		arity: -1,
		handler: (ctx, args) => {
			const sub = args[0]?.toUpperCase()

			if (sub === undefined || sub === 'DOCS' || sub === 'INFO') {
				return array([])
			}

			if (sub === 'COUNT') {
				return int(ctx.engine.commandNames().length)
			}

			if (sub === 'LIST') {
				return bulks(ctx.engine.commandNames().map(n => n.toLowerCase()))
			}

			if (sub === 'GETKEYS' || sub === 'GETKEYSANDFLAGS' || sub === 'HELP') {
				throw unsupported(`COMMAND ${sub}`)
			}

			throw unknownSubcommand(args[0]!, 'command')
		},
	},
	{ name: 'CONFIG', arity: -2, noscript: true, handler: config },
	{
		name: 'DBSIZE',
		arity: 1,
		handler: ctx => int(ctx.db.keys().filter(key => ctx.db.get(key, ctx.now)).length),
	},
	{
		name: 'TIME',
		arity: 1,
		handler: ctx => bulks([String(Math.floor(ctx.now / 1000)), String((ctx.now % 1000) * 1000)]),
	},
	{
		name: 'FLUSHDB',
		arity: -1,
		write: true,
		handler: (ctx, args) => {
			parseFlushMode(args)
			ctx.db.flush()
			return OK
		},
	},
	{
		name: 'FLUSHALL',
		arity: -1,
		write: true,
		handler: (ctx, args) => {
			parseFlushMode(args)
			ctx.engine.flushAll()
			return OK
		},
	},
	{
		name: 'SWAPDB',
		arity: 3,
		write: true,
		noscript: true,
		handler: (ctx, args) => {
			const a = ctx.engine.databases[parseInteger(args[0]!, () => new RedisError('ERR invalid first DB index'))]
			const b = ctx.engine.databases[parseInteger(args[1]!, () => new RedisError('ERR invalid second DB index'))]

			if (!a) throw new RedisError('ERR DB index is out of range')
			if (!b) throw new RedisError('ERR DB index is out of range')

			if (a !== b) {
				a.swapWith(b)
			}

			return OK
		},
	},
	{ name: 'LASTSAVE', arity: 1, handler: ctx => int(Math.floor(ctx.now / 1000)) },
	{ name: 'SAVE', arity: 1, noscript: true, handler: () => OK },
	{ name: 'BGSAVE', arity: -1, noscript: true, handler: () => status('Background saving started') },
	{ name: 'ROLE', arity: 1, handler: () => array([bulk('master'), int(0), array([])]) },
	{
		name: 'BGREWRITEAOF',
		arity: 1,
		noscript: true,
		handler: () => {
			throw unsupported('BGREWRITEAOF')
		},
	},
	{
		name: 'DEBUG',
		arity: -2,
		noscript: true,
		handler: () => {
			throw unsupported('DEBUG')
		},
	},
	{
		name: 'MONITOR',
		arity: 1,
		noscript: true,
		handler: () => {
			throw unsupported('MONITOR')
		},
	},
	{
		name: 'SHUTDOWN',
		arity: -1,
		noscript: true,
		handler: () => {
			throw unsupported('SHUTDOWN')
		},
	},
	{
		name: 'SLOWLOG',
		arity: -2,
		noscript: true,
		handler: () => {
			throw unsupported('SLOWLOG')
		},
	},
	{
		name: 'MEMORY',
		arity: -2,
		handler: () => {
			throw unsupported('MEMORY')
		},
	},
	{
		name: 'LATENCY',
		arity: -2,
		handler: () => {
			throw unsupported('LATENCY')
		},
	},
	{
		name: 'ACL',
		arity: -2,
		noscript: true,
		handler: () => {
			throw unsupported('ACL')
		},
	},
	{
		name: 'CLUSTER',
		arity: -2,
		handler: () => {
			throw new RedisError('ERR This instance has cluster support disabled')
		},
	},
	{
		name: 'FUNCTION',
		arity: -2,
		noscript: true,
		handler: () => {
			throw unsupported('FUNCTION')
		},
	},
	{
		name: 'FCALL',
		arity: -3,
		noscript: true,
		handler: () => {
			throw unsupported('FCALL')
		},
	},
	{
		name: 'FCALL_RO',
		arity: -3,
		noscript: true,
		handler: () => {
			throw unsupported('FCALL_RO')
		},
	},
]
