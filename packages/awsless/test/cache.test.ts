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

	it('creates the cluster client on first use', async () => {
		const { createIoRedisClient } = await import('@awsless/redis')
		const { Cache } = await import('../src/lib/server/cache')
		const client = (Cache as any).stack.main()

		await client.send('PING', [])

		expect(createIoRedisClient).toHaveBeenCalledWith(
			expect.objectContaining({ host: 'localhost', port: 6379, db: 0, cluster: true })
		)
	})

	it('keeps one connection across warm invocations', async () => {
		const { lambda } = await import('@awsless/lambda')
		const { Cache } = await import('../src/lib/server/cache')
		const client = (Cache as any).stack.main(1)
		const before = clients.length

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
})
