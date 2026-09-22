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
		expect(() => client.send('PING', [])).toThrow('Lambda context is not available')

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

	it('leaves an untouched client alone', async () => {
		const { lambda } = await import('@awsless/lambda')
		const { Cache } = await import('../src/lib/server/cache')
		const client = (Cache as any).stack.main(2)
		const before = clients.length

		await lambda({ handle: async () => {} })({})

		expect(clients.length).toBe(before)
		void client
	})
})
