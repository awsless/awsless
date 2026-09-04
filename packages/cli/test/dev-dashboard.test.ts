import { mkdtemp, readFile, rm } from 'fs/promises'
import { request } from 'http'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { createDevContext } from '../src/dev/context'
import { createDashboardServer } from '../src/dev/dashboard/index'
import { createServerPool } from '../src/dev/pool'

type Reply = { status: number; headers: Record<string, unknown>; body: string }

// Plain http requests, since fetch refuses to send a custom Host.
const send = (
	port: number,
	path: string,
	headers: Record<string, string> = {},
	method = 'GET',
	options: { until?: (body: string) => boolean; body?: string } = {}
) => {
	return new Promise<Reply>((resolve, reject) => {
		const req = request({ host: '127.0.0.1', port, method, path, headers }, res => {
			let body = ''

			const done = () => resolve({ status: res.statusCode ?? 0, headers: res.headers, body })

			res.on('data', chunk => {
				body += String(chunk)

				// A streaming response never ends on its own, so the
				// caller decides when it has seen enough.
				if (options.until?.(body)) {
					res.destroy()
					done()
				}
			})
			res.on('end', done)
		})

		req.on('error', reject)
		req.end(options.body)
	})
}

const sseMessages = (body: string) =>
	body
		.split('\n\n')
		.filter(part => part.includes('data: '))
		.map(part => {
			const id = part.match(/^id: (\d+)/m)?.[1]
			const data = part.match(/^data: (.*)$/m)![1]!

			return { id: Number(id), ...JSON.parse(data) }
		})

describe('dev dashboard', () => {
	let port: number
	let root: string
	let stop: () => Promise<void>

	const dev = createDevContext({
		appConfig: { name: 'test-app', region: 'us-east-1' } as never,
		stackConfigs: [],
		appId: 'test',
		routerPorts: { main: 3001 },
		log: () => {},
		pool: createServerPool(),
	})

	const dispatch = vi.fn(async (event: unknown) => ({ echo: event }))

	beforeAll(async () => {
		root = await mkdtemp(join(tmpdir(), 'awsless-dashboard-'))

		const server = createDashboardServer({
			app: 'test-app',
			region: 'us-east-1',
			routerPorts: { main: 3001 },
			resources: [
				{ kind: 'function', id: 'get<script>', stack: 'api', routeKey: 'api:get' },
				{ kind: 'search', id: 'docs', stack: 'api', detail: '127.0.0.1:1' },
				{ kind: 'cache', id: 'session', stack: 'api', detail: '127.0.0.1:1' },
			],
			routes: [],
			env: {},
			storeRoot: join(root, 'store'),
			configFile: join(root, 'config.json'),
			events: dev.events,
		})

		server.connect(dispatch)

		port = await server.listen(0)
		stop = () => server.stop()
	})

	afterAll(async () => {
		await stop()
		await rm(root, { recursive: true, force: true })
	})

	// Same origin requests, like the dashboard page itself makes.
	const own = (extra: Record<string, string> = {}) => ({
		host: `localhost:${port}`,
		origin: `http://localhost:${port}`,
		...extra,
	})

	const post = (path: string, body: unknown, headers = own()) =>
		send(port, path, headers, 'POST', { body: JSON.stringify(body) })

	it('should render the page with the embedded state', async () => {
		const res = await send(port, '/functions', { host: `localhost:${port}` })

		expect(res.status).toBe(200)
		expect(res.headers['content-type']).toBe('text/html; charset=utf-8')
		expect(res.body).not.toContain('__STATE__')
		expect(res.body).toContain('"app":"test-app"')

		// The state can never close its own script tag.
		expect(res.body).toContain('get\\u003cscript>')
		expect(res.body).not.toContain('get<script>')
	})

	it('should accept every loopback host, including ipv6', async () => {
		for (const host of ['localhost:3000', '127.0.0.1:3000', '[::1]:3000', 'localhost', '::1']) {
			await expect(send(port, '/api/emails', { host }), host).resolves.toMatchObject({ status: 200 })
		}
	})

	it('should reject foreign hosts & cross-origin requests, including other local ports', async () => {
		const forbidden = { status: 403 }

		await expect(send(port, '/', { host: 'evil.com' })).resolves.toMatchObject(forbidden)
		await expect(send(port, '/', { host: 'localhost.evil.com:3000' })).resolves.toMatchObject(forbidden)
		await expect(
			send(port, '/api/emails', { host: 'localhost:3000', origin: 'http://evil.com' })
		).resolves.toMatchObject(forbidden)
		await expect(
			send(port, '/api/seed', { host: 'localhost:3000', origin: 'null' }, 'POST')
		).resolves.toMatchObject(forbidden)

		// A page served by another local dev server must never drive
		// the dashboard.
		await expect(
			send(port, '/api/seed', { host: `localhost:${port}`, origin: 'http://localhost:5173' }, 'POST')
		).resolves.toMatchObject(forbidden)

		for (const origin of [`http://localhost:${port}`, `http://127.0.0.1:${port}`, `http://[::1]:${port}`]) {
			await expect(
				send(port, '/api/emails', { host: `localhost:${port}`, origin }),
				origin
			).resolves.toMatchObject({
				status: 200,
			})
		}
	})

	it('should invoke a route through the connected dispatch', async () => {
		const res = await post('/api/invoke', { routeKey: 'api:get', event: { id: 1 } })

		expect(res.status).toBe(200)
		expect(JSON.parse(res.body)).toEqual({ result: { echo: { '$awsless-route': 'api:get', event: { id: 1 } } } })
		expect(dispatch).toHaveBeenCalledTimes(1)
	})

	it('should only accept a plain object of strings as the local config', async () => {
		await expect(send(port, '/api/config', own(), 'PUT', { body: '["a"]' })).resolves.toMatchObject({ status: 400 })
		await expect(send(port, '/api/config', own(), 'PUT', { body: '"text"' })).resolves.toMatchObject({
			status: 400,
		})
		await expect(send(port, '/api/config', own(), 'PUT', { body: '{"a": 1}' })).resolves.toMatchObject({
			status: 400,
		})

		const put = await send(port, '/api/config', own(), 'PUT', { body: '{"greeting": "hi", "other": "x"}' })

		expect(put.status).toBe(200)
		expect(JSON.parse(await readFile(join(root, 'config.json'), 'utf8'))).toEqual({ greeting: 'hi', other: 'x' })

		const get = await send(port, '/api/config', own())

		expect(JSON.parse(get.body)).toEqual({ values: { greeting: 'hi', other: 'x' }, pulled: [] })
	})

	it('should only proxy search & cache requests to registered targets', async () => {
		await expect(post('/api/search', { target: 'example.com:80', path: '/' })).resolves.toMatchObject({
			status: 400,
		})

		// A relative path would turn the target into the userinfo of
		// another host.
		const escaped = await post('/api/search', { target: '127.0.0.1:1', path: '@example.com/' })

		expect(escaped.status).toBe(400)
		expect(escaped.body).toContain('slash')

		await expect(send(port, '/api/cache?target=example.com:6379', own())).resolves.toMatchObject({ status: 400 })
		await expect(post('/api/instance/send', { stack: 'api', id: 'nope', payload: {} })).resolves.toMatchObject({
			status: 400,
		})
	})

	it('should apply the origin check to the event stream', async () => {
		await expect(send(port, '/api/events?channel=worker', { host: 'evil.com' })).resolves.toMatchObject({
			status: 403,
		})
		await expect(
			send(port, '/api/events?channel=worker', { host: 'localhost:3000', origin: 'http://evil.com' })
		).resolves.toMatchObject({ status: 403 })
	})

	it('should stream every requested channel over one connection with event ids', async () => {
		const reply = send(port, '/api/events?channel=worker&channel=health', own(), 'GET', {
			until: body => body.includes('"channel":"health"') && body.includes('"channel":"worker"'),
		})

		// The subscription lands a tick after the request, so the emits
		// wait for the connected marker.
		await new Promise(resolve => setTimeout(resolve, 50))

		dev.events.emit('worker', { line: 'hello' })
		dev.events.emit('activity', { route: 'ignored' })
		dev.events.emit('health', { id: 'workers', status: 'up' })

		const res = await reply
		const messages = sseMessages(res.body)

		expect(res.status).toBe(200)
		expect(res.headers['content-type']).toBe('text/event-stream')
		expect(messages).toEqual([
			{ id: expect.any(Number), channel: 'worker', data: { line: 'hello' } },
			{ id: expect.any(Number), channel: 'health', data: { id: 'workers', status: 'up' } },
		])
		expect(messages[1]!.id).toBeGreaterThan(messages[0]!.id)
	})

	it('should replay only what a reconnecting stream has not seen', async () => {
		dev.events.emit('worker', { line: 'one' })
		dev.events.emit('worker', { line: 'two' })

		const full = sseMessages(
			(await send(port, '/api/events?channel=worker', own(), 'GET', { until: body => body.includes('"two"') }))
				.body
		)
		const lastSeen = full.at(-1)!.id

		dev.events.emit('worker', { line: 'three' })

		const resumed = sseMessages(
			(
				await send(port, '/api/events?channel=worker', own({ 'last-event-id': String(lastSeen) }), 'GET', {
					until: body => body.includes('"three"'),
				})
			).body
		)

		expect(resumed.map(message => message.data.line)).toEqual(['three'])
	})
})
