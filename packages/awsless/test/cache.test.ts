import { mockTraceDaemon } from '@awsless/utils'

const { clients } = vi.hoisted(() => ({
	clients: [] as { destroy: ReturnType<typeof vi.fn> }[],
}))

vi.mock('@awsless/redis', async importOriginal => ({
	...(await importOriginal<typeof import('@awsless/redis')>()),
	createIoRedisClient: vi.fn(() => {
		const client = {
			send: vi.fn(async () => 'PONG'),
			batch: vi.fn(),
			transact: vi.fn(),
			destroy: vi.fn(async () => {}),
		}

		clients.push(client)

		return client
	}),
}))

// Stubbed before the cache module loads, so it takes the production paths.
vi.stubEnv('LAMBDA_ENV', 'production')
vi.stubEnv('CACHE_STACK_MAIN_HOST', 'localhost')
vi.stubEnv('CACHE_STACK_MAIN_PORT', '6379')

describe('cache', () => {
	afterAll(() => {
		vi.unstubAllEnvs()
	})

	it('needs a lambda invocation to create the client', async () => {
		const { lambda } = await import('@awsless/lambda')
		const { createIoRedisClient } = await import('@awsless/redis')
		const { Cache } = await import('../src/lib/server/cache')
		const client = (Cache as any).stack.main()

		// The cleanup is tied to the invocation context, so the client can
		// only be created while one is active.
		await expect(client.send('PING', [])).rejects.toThrow('Lambda context is not available')

		await lambda({ handle: async () => client.send('PING', []) })({})

		expect(createIoRedisClient).toHaveBeenCalledWith(
			expect.objectContaining({ host: 'localhost', port: 6379, db: 0, cluster: true })
		)
	})

	it('registers the cleanup once, on the invocation that first uses the client', async () => {
		const { lambda } = await import('@awsless/lambda')
		const { Cache } = await import('../src/lib/server/cache')
		const client = (Cache as any).stack.main(1)

		// One module scope client, used by two warm invocations and by an
		// inner call within the first: only the first invocation's cleanup
		// runs, the client is not torn down per call.
		const handle = lambda({
			handle: async () => {
				await client.send('PING', [])
				await lambda({ handle: async () => client.send('PING', []) })({})
			},
		})

		await handle({})
		const destroy = clients.at(-1)!.destroy

		expect(destroy).toHaveBeenCalledTimes(1)

		await handle({})

		expect(destroy).toHaveBeenCalledTimes(1)
	})

	it('keeps the connection across warm invocations with keepConnection', async () => {
		const { lambda } = await import('@awsless/lambda')
		const { Cache } = await import('../src/lib/server/cache')
		const client = (Cache as any).stack.main(3, { keepConnection: true })
		const before = clients.length

		// Created outside an invocation too, since nothing ties it to one.
		await client.send('PING', [])

		// One module scope client, used by two warm invocations and by an
		// inner call within the first: it's never torn down between them.
		const handle = lambda({
			handle: async () => {
				await client.send('PING', [])
				await lambda({ handle: async () => client.send('PING', []) })({})
			},
		})

		await handle({})
		await handle({})

		expect(clients.length).toBe(before + 1)
		expect(clients.at(-1)!.destroy).not.toHaveBeenCalled()
	})

	it('leaves an untouched client alone', async () => {
		const { lambda } = await import('@awsless/lambda')
		const { Cache } = await import('../src/lib/server/cache')
		const client = (Cache as any).stack.main(2)
		const before = clients.length

		await lambda({ handle: async () => {} })({})

		expect(clients.length).toBe(before)
		void client
	})

	it('spans each command by its name and cache alone', async () => {
		const daemon = await mockTraceDaemon()
		const { lambda } = await import('@awsless/lambda')
		const { Cache } = await import('../src/lib/server/cache')
		const client = (Cache as any).stack.main(4)

		await lambda({
			handle: async () => {
				await client.send('GET', ['session:user-1042@example.com'])
				await client.batch([
					{ name: 'INCRBY', args: ['count:user-1042@example.com', 1] },
					{ name: 'GET', args: ['count:user-1042@example.com'] },
				])
			},
		})({})

		const [send, batch] = await daemon.received(2)
		daemon.close()

		expect(send).toMatchObject({
			name: 'Redis',
			namespace: 'remote',
			annotations: { redis_command: 'get' },
			metadata: { default: { cache: 'stack.main' } },
		})
		expect(batch).toMatchObject({
			annotations: { redis_command: 'batch' },
			metadata: { default: { cache: 'stack.main', commands: 2, command_names: 'incrby,get' } },
		})
		expect(JSON.stringify([send, batch])).not.toContain('example.com')
	})
})
