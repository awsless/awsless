import { mkdtemp, rm } from 'fs/promises'
import { request } from 'http'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createDashboardServer } from '../src/dev/dashboard/index'

type Reply = { status: number; headers: Record<string, unknown>; body: string }

// Plain http requests, since fetch refuses to send a custom Host.
const send = (
	port: number,
	path: string,
	headers: Record<string, string> = {},
	method = 'GET',
	options: { until?: (body: string) => boolean } = {}
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
		req.end()
	})
}

describe('dev dashboard', () => {
	let port: number
	let root: string
	let stop: () => Promise<void>

	const listeners = new Map<string, Set<(data: unknown) => void>>()
	const emit = (channel: string, data: unknown) => listeners.get(channel)?.forEach(listener => listener(data))

	beforeAll(async () => {
		root = await mkdtemp(join(tmpdir(), 'awsless-dashboard-'))

		const server = createDashboardServer({
			app: 'test-app',
			region: 'us-east-1',
			routerPorts: { main: 3001 },
			resources: [{ kind: 'function', id: 'get<script>', stack: 'api', routeKey: 'api:get' }],
			routes: [],
			env: {},
			storeRoot: join(root, 'store'),
			configFile: join(root, 'config.json'),
			events: {
				subscribe: (channel, listener) => {
					if (!listeners.has(channel)) {
						listeners.set(channel, new Set())
					}

					listeners.get(channel)!.add(listener)

					return () => listeners.get(channel)?.delete(listener)
				},
			},
		})

		port = await server.listen(0)
		stop = () => server.stop()
	})

	afterAll(async () => {
		await stop()
		await rm(root, { recursive: true, force: true })
	})

	it('should render the page with the embedded state', async () => {
		const res = await send(port, '/functions', { host: `localhost:${port}` })

		expect(res.status).toBe(200)
		expect(res.headers['content-type']).toBe('text/html; charset=utf-8')
		expect(res.body).not.toContain('__STATE__')
		expect(res.body).toContain('"app":"test-app"')

		// The state can never close its own script tag.
		expect(res.body).toContain('get\\u003cscript>')
		expect(res.body).not.toContain('get<script>')

		// The assets are inlined, so the page needs no extra requests.
		expect(res.body).not.toContain('href="dashboard.css"')
		expect(res.body).not.toContain('src="dashboard.js"')
		expect(res.body).toContain('<style>')
		expect(res.body).toContain('const openEvents')
	})

	it('should accept every loopback host, including ipv6', async () => {
		for (const host of ['localhost:3000', '127.0.0.1:3000', '[::1]:3000', 'localhost', '::1']) {
			await expect(send(port, '/api/emails', { host }), host).resolves.toMatchObject({ status: 200 })
		}
	})

	it('should reject foreign hosts & cross-origin requests', async () => {
		const forbidden = { status: 403 }

		await expect(send(port, '/', { host: 'evil.com' })).resolves.toMatchObject(forbidden)
		await expect(send(port, '/', { host: 'localhost.evil.com:3000' })).resolves.toMatchObject(forbidden)
		await expect(send(port, '/api/emails', { host: 'localhost:3000', origin: 'http://evil.com' })).resolves.toMatchObject(
			forbidden
		)
		await expect(
			send(port, '/api/seed', { host: 'localhost:3000', origin: 'null' }, 'POST')
		).resolves.toMatchObject(forbidden)

		for (const origin of ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://[::1]:3000']) {
			await expect(send(port, '/api/emails', { host: 'localhost:3000', origin }), origin).resolves.toMatchObject({
				status: 200,
			})
		}
	})

	it('should apply the origin check to the event stream', async () => {
		await expect(send(port, '/api/events?channel=worker', { host: 'evil.com' })).resolves.toMatchObject({
			status: 403,
		})
		await expect(
			send(port, '/api/events?channel=worker', { host: 'localhost:3000', origin: 'http://evil.com' })
		).resolves.toMatchObject({ status: 403 })
	})

	it('should stream every requested channel over one connection', async () => {
		const reply = send(
			port,
			'/api/events?channel=worker&channel=health',
			{ host: 'localhost:3000' },
			'GET',
			{ until: body => body.includes('"channel":"health"') && body.includes('"channel":"worker"') }
		)

		await expect
			.poll(() => (listeners.get('worker')?.size ?? 0) > 0 && (listeners.get('health')?.size ?? 0) > 0)
			.toBe(true)

		emit('worker', { line: 'hello' })
		emit('activity', { route: 'ignored' })
		emit('health', { id: 'workers', status: 'up' })

		const res = await reply
		const messages = res.body
			.split('\n\n')
			.filter(part => part.startsWith('data: '))
			.map(part => JSON.parse(part.slice('data: '.length)))

		expect(res.status).toBe(200)
		expect(res.headers['content-type']).toBe('text/event-stream')
		expect(messages).toEqual([
			{ channel: 'worker', data: { line: 'hello' } },
			{ channel: 'health', data: { id: 'workers', status: 'up' } },
		])

		// The closed stream drops its subscriptions.
		await expect.poll(() => listeners.get('worker')?.size ?? 0).toBe(0)
	})
})
