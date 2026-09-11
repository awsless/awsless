import { createHash } from 'node:crypto'
import { connect } from 'node:net'
import { Redis, type RedisOptions } from 'ioredis'
import { RedisServer } from '../src'

const createClient = (server: RedisServer, options: RedisOptions = {}) => {
	const client = new Redis({
		host: server.host,
		port: server.port,
		stringNumbers: true,
		enableReadyCheck: false,
		maxRetriesPerRequest: 1,
		// A dropped socket must fail fast instead of reconnecting forever.
		retryStrategy: () => null,
		...options,
	})

	client.on('error', () => {})

	return client
}

const rawRequest = (server: RedisServer, frames: string[], delay = 20) =>
	new Promise<string>((resolve, reject) => {
		const socket = connect(server.port, server.host)
		let received = ''

		socket.on('error', reject)
		socket.on('data', chunk => {
			received += chunk.toString('latin1')
		})
		socket.on('connect', () => {
			frames.forEach((frame, i) => setTimeout(() => socket.write(frame), i * delay))
			setTimeout(
				() => {
					socket.destroy()
					resolve(received)
				},
				frames.length * delay + 60
			)
		})
	})

describe('RedisServer', () => {
	const server = new RedisServer({ databases: 256 })
	let client: Redis

	beforeAll(async () => {
		await server.listen()
		client = createClient(server)
	})

	afterAll(async () => {
		client.disconnect()
		await server.close()
	})

	it('binds an os assigned port and rejects a second listen', async () => {
		expect(server.port).toBeGreaterThan(0)
		expect(server.host).toBe('127.0.0.1')
		await expect(server.listen()).rejects.toThrow(/already listening/)
	})

	it('answers basic commands', async () => {
		expect(await client.ping()).toBe('PONG')
		expect(await client.set('k', 'v')).toBe('OK')
		expect(await client.get('k')).toBe('v')
		expect(await client.incr('n')).toBe('1')
		await expect(client.incr('k')).rejects.toThrow('ERR value is not an integer or out of range')
		await expect(client.call('NOPE')).rejects.toThrow("ERR unknown command 'NOPE'")
	})

	it('pipelines', async () => {
		const results = await client.pipeline().set('p', '1').incr('p').get('p').lpush('p', 'x').exec()

		expect(results).toEqual([
			[null, 'OK'],
			[null, '2'],
			[null, '2'],
			[expect.objectContaining({ message: expect.stringContaining('WRONGTYPE') })],
		])
	})

	it('runs transactions', async () => {
		expect(await client.multi().set('t', '1').incr('t').get('t').exec()).toEqual([
			[null, 'OK'],
			[null, '2'],
			[null, '2'],
		])

		await expect(client.multi().call('SET', 't').exec()).rejects.toThrow(/EXECABORT|wrong number of arguments/)
	})

	it('handles pub/sub across clients', async () => {
		const subscriber = createClient(server)
		const patternSubscriber = createClient(server)
		const messages: unknown[] = []
		const patternMessages: unknown[] = []

		subscriber.on('message', (channel, message) => messages.push([channel, message]))
		patternSubscriber.on('pmessage', (pattern, channel, message) =>
			patternMessages.push([pattern, channel, message])
		)

		expect(await subscriber.subscribe('news', 'other')).toBe('2')
		expect(await patternSubscriber.psubscribe('ne*')).toBe('1')

		expect(await client.publish('news', 'hello')).toBe('2')
		expect(await client.publish('nobody', 'x')).toBe('0')
		expect(await client.pubsub('NUMSUB', 'news')).toEqual(['news', '1'])

		await new Promise(resolve => setTimeout(resolve, 30))

		expect(messages).toEqual([['news', 'hello']])
		expect(patternMessages).toEqual([['ne*', 'news', 'hello']])

		expect(await subscriber.unsubscribe('news')).toBe('1')
		expect(await subscriber.unsubscribe()).toBe('0')
		expect(await subscriber.get('k')).toBe('v')

		subscriber.disconnect()
		patternSubscriber.disconnect()
	})

	it('evaluates scripts with the noscript retry', async () => {
		const script = 'return ARGV[1]'
		const sha = createHash('sha1').update(script).digest('hex')

		await expect(client.evalsha(sha, 0, 'a')).rejects.toThrow('NOSCRIPT')
		expect(await client.eval(script, 0, 'a')).toBe('a')
		expect(await client.evalsha(sha, 0, 'b')).toBe('b')
		expect(await client.script('EXISTS', sha)).toEqual(['1'])
		expect(await client.eval("return redis.call('set', KEYS[1], ARGV[1])", 1, 'lua', 'x')).toBe('OK')
		expect(await client.get('lua')).toBe('x')
		expect(await client.eval("return {1, 'a', {2}}", 0)).toEqual(['1', 'a', ['2']])
		await expect(client.eval("return redis.call('incr', 'k')", 0)).rejects.toThrow(
			'ERR value is not an integer or out of range script:'
		)
	})

	// ioredis flattens pair replies for its own lowercase methods, so raw
	// uppercase calls are used to observe the wire shape.
	it('uses resp3 shapes for a resp3 client and flat ones for resp2', async () => {
		await client.zadd('zs', '1', 'a', '2', 'b')
		await client.hset('hs', 'f', 'v')
		expect(await client.call('ZRANGE', 'zs', '0', '-1', 'WITHSCORES')).toEqual([
			['a', '1'],
			['b', '2'],
		])
		expect(await client.zrange('zs', '0', '-1', 'WITHSCORES')).toEqual(['a', '1', 'b', '2'])
		expect(await client.call('ZPOPMIN', 'zs', '1')).toEqual([['a', '1']])
		expect(await client.call('ZPOPMIN', 'zs')).toEqual(['b', '2'])
		expect(await client.hgetall('hs')).toEqual({ f: 'v' })
		expect(await client.call('HGETALL', 'hs')).toEqual(['f', 'v'])
		expect(await client.smembers('nope')).toEqual([])
		expect(await client.get('nope')).toBeNull()
		expect(await client.call('ZSCORE', 'zs', 'nope')).toBeNull()

		const legacy = createClient(server, { protocol: 2 })
		await legacy.zadd('zs', '1', 'a', '2', 'b')
		expect(await legacy.call('ZRANGE', 'zs', '0', '-1', 'WITHSCORES')).toEqual(['a', '1', 'b', '2'])
		expect(await legacy.call('HGETALL', 'hs')).toEqual(['f', 'v'])
		expect(await legacy.get('nope')).toBeNull()
		legacy.disconnect()
	})

	it('selects databases', async () => {
		expect(await client.select(255)).toBe('OK')
		expect(await client.set('only-here', '1')).toBe('OK')
		expect(await client.dbsize()).toBe('1')
		await expect(client.select(256)).rejects.toThrow('ERR DB index is out of range')
		expect(await client.select(0)).toBe('OK')
		expect(await client.exists('only-here')).toBe('0')
		expect(await client.config('GET', 'databases')).toEqual(['databases', '256'])
	})

	it('reports the keyspace in info', async () => {
		await client.set('expiring', '1', 'EX', 100)
		const info = await client.info('keyspace')
		expect(info).toMatch(/^db0:keys=\d+,expires=1,avg_ttl=0\r?$/m)
		expect(info).toMatch(/^db255:keys=1,expires=0,avg_ttl=0\r?$/m)
	})

	it('scans keys', async () => {
		for (let i = 0; i < 30; i++) {
			await client.set(`scan:${i}`, 'v')
		}

		const keys: string[] = []
		let cursor = '0'

		do {
			const [next, batch] = await client.scan(cursor, 'MATCH', 'scan:*', 'COUNT', 7)
			keys.push(...batch)
			cursor = next
		} while (cursor !== '0')

		expect(keys).toHaveLength(30)
	})

	it('handles a frame split across writes and inline commands', async () => {
		const frame = '*3\r\n$3\r\nSET\r\n$5\r\nsplit\r\n$5\r\nvalue\r\n*2\r\n$3\r\nGET\r\n$5\r\nsplit\r\n'
		const out = await rawRequest(server, [frame.slice(0, 17), frame.slice(17, 40), frame.slice(40)])
		expect(out).toBe('+OK\r\n$5\r\nvalue\r\n')

		expect(await rawRequest(server, ['PING\r\n', 'GET split\r\nEXISTS split "split two"\r\n'])).toBe(
			'+PONG\r\n$5\r\nvalue\r\n:1\r\n'
		)
	})

	it('rejects protocol errors', async () => {
		expect(await rawRequest(server, ['*1\r\n+PING\r\n'])).toMatch(/^-ERR Protocol error: expected '\$'/)
	})

	it('quits cleanly', async () => {
		const quitter = createClient(server)
		expect(await quitter.quit()).toBe('OK')
		await new Promise(resolve => setTimeout(resolve, 20))
		expect(quitter.status).toBe('end')
	})

	it('flushes everything', async () => {
		server.flushAll()
		expect(await client.dbsize()).toBe('0')
	})
})

describe('RedisServer close', () => {
	it('drops a subscribed client and can be closed twice', async () => {
		const server = new RedisServer()
		await server.listen()

		const subscriber = createClient(server)
		const closed = new Promise<void>(resolve => subscriber.once('close', () => resolve()))
		await subscriber.subscribe('chan')

		await server.close()
		await server.close()
		await closed

		expect(server.port).toBe(0)
		expect(subscriber.status).not.toBe('ready')
	})

	it('can listen again after closing', async () => {
		const server = new RedisServer()
		await server.listen()
		const port = server.port
		await server.close()
		await server.listen(port)
		expect(server.port).toBe(port)
		const client = createClient(server)
		expect(await client.ping()).toBe('PONG')
		client.disconnect()
		await server.close()
	})
})
