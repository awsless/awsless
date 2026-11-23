import { trace, withTraceHeader } from '@awsless/utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createXRayServer, DevSpan, toXRayHeader } from '../src/dev/servers/xray'

describe('dev x-ray server', () => {
	afterEach(() => {
		vi.unstubAllEnvs()
	})

	it("nests the runtime's spans under the dispatch they ran in", async () => {
		const spans: DevSpan[] = []
		const server = createXRayServer({ onSpan: span => spans.push(span) })
		const port = await server.listen()

		vi.stubEnv('AWSLESS_TRACING', 'true')
		vi.stubEnv('AWS_XRAY_DAEMON_ADDRESS', `127.0.0.1:${port}`)

		const dispatch = { traceId: 'a1b2c3d4', spanId: 'e5f60718' }

		await withTraceHeader(toXRayHeader(dispatch), () =>
			trace('route', () => trace('dynamodb', () => {}, { namespace: 'aws', aws: { operation: 'Query' } }))
		)

		await vi.waitFor(() => expect(spans).toHaveLength(2))
		server.stop()

		const route = spans.find(span => span.name === 'route')!
		const query = spans.find(span => span.name === 'dynamodb')!

		expect(route).toMatchObject({ trace: 'a1b2c3d4', parent: 'e5f60718', ok: true })
		expect(query).toMatchObject({ trace: 'a1b2c3d4', parent: route.id, namespace: 'aws', operation: 'Query' })
	})
})
