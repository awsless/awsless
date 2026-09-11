import { OpenSearchServer } from '../src'

// Opt-in, since it downloads and boots the real OpenSearch distribution:
// AWSLESS_LOCAL_ENGINE=real pnpm test
describe.skipIf(process.env.AWSLESS_LOCAL_ENGINE !== 'real')('Real OpenSearch engine', () => {
	const server = new OpenSearchServer({ engine: 'opensearch' })

	afterAll(() => server.close())

	it(
		'boots the real distribution and answers requests',
		async () => {
			await server.listen()
			expect(server.port).toBeGreaterThan(0)

			const info = await fetch(server.endpoint)
			expect(info.ok).toBe(true)

			await fetch(`${server.endpoint}/probe`, { method: 'PUT' })
			const cat = await fetch(`${server.endpoint}/_cat/indices?format=json`)
			expect((await cat.json()).some((row: { index: string }) => row.index === 'probe')).toBe(true)

			await server.reset()
		},
		20 * 60 * 1000
	)
})
