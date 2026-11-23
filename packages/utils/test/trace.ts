import { createServer } from 'node:http'
import {
	addTraceMiddleware,
	flushTraces,
	globalClient,
	isTracing,
	mockTraceDaemon,
	parseTraceHeader,
	trace,
	TRACE_PARENT,
	TRACE_ROOT,
	withTraceHeader,
} from '../src'

const ROOT = TRACE_ROOT
const LAMBDA_SEGMENT = TRACE_PARENT

describe('trace', () => {
	let daemon: Awaited<ReturnType<typeof mockTraceDaemon>>

	beforeEach(async () => {
		daemon = await mockTraceDaemon()
		// With a Lineage, which a child header has to keep.
		vi.stubEnv('_X_AMZN_TRACE_ID', `Root=${ROOT};Parent=${LAMBDA_SEGMENT};Sampled=1;Lineage=a87bd80c:0`)
	})

	afterEach(() => {
		daemon.close()
		vi.unstubAllEnvs()
		vi.restoreAllMocks()
	})

	it('parses the trace header', () => {
		expect(parseTraceHeader(`Root=${ROOT};Parent=${LAMBDA_SEGMENT};Sampled=0`)).toMatchObject({
			root: ROOT,
			parent: LAMBDA_SEGMENT,
			sampled: false,
		})
		expect(parseTraceHeader('Parent=1')).toBeUndefined()
		expect(parseTraceHeader(undefined)).toBeUndefined()
	})

	it('traces only an app with tracing on and a sampled invocation', () => {
		expect(isTracing()).toBe(true)

		vi.stubEnv('_X_AMZN_TRACE_ID', `Root=${ROOT};Parent=${LAMBDA_SEGMENT};Sampled=0`)
		expect(isTracing()).toBe(false)

		vi.stubEnv('_X_AMZN_TRACE_ID', `Root=${ROOT};Parent=${LAMBDA_SEGMENT};Sampled=1`)
		vi.stubEnv('AWSLESS_TRACING', '')
		expect(isTracing()).toBe(false)
	})

	it('nests spans under the one they run in', async () => {
		const result = await trace(
			'stack:function:outer',
			async () => {
				await trace('ClickHouse', async () => 1, { namespace: 'remote' })
				return 'done'
			},
			{ annotations: { route: 'stack:function:outer' } }
		)

		expect(result).toBe('done')

		const [inner, outer] = await daemon.received(2)

		expect(outer).toMatchObject({
			type: 'subsegment',
			name: 'stack:function:outer',
			trace_id: ROOT,
			parent_id: LAMBDA_SEGMENT,
			annotations: { route: 'stack:function:outer' },
		})
		expect(inner).toMatchObject({ name: 'ClickHouse', namespace: 'remote', trace_id: ROOT, parent_id: outer!.id })
		expect(outer!.end_time).toBeGreaterThanOrEqual(outer!.start_time as number)
	})

	it('marks a thrown error a fault, by its class name only', async () => {
		await expect(
			trace('stack:task:fail', () => {
				throw new TypeError('user-1042@example.com is not allowed')
			})
		).rejects.toThrow(TypeError)

		const [segment] = await daemon.received(1)

		expect(segment).toMatchObject({ fault: true, cause: { exceptions: [{ type: 'TypeError' }] } })
		expect(JSON.stringify(segment)).not.toContain('example.com')
	})

	it('lets the caller decide how a result ends the span', async () => {
		await trace('stack:rpc:answer', async () => ({ __error__: { type: 'not-found' } }), {
			endWith: () => ({ error: true, errorType: 'not-found' }),
		})

		const [segment] = await daemon.received(1)

		expect(segment).toMatchObject({ error: true, cause: { exceptions: [{ type: 'not-found' }] } })
		expect(segment).not.toHaveProperty('fault')
	})

	it('sends nothing without tracing', async () => {
		vi.stubEnv('AWSLESS_TRACING', '')

		expect(await trace('stack:function:quiet', () => 'value')).toBe('value')

		await flushTraces()
		await new Promise(resolve => setTimeout(resolve, 50))
		expect(daemon.segments).toHaveLength(0)
	})

	it('spans an AWS SDK call and points the downstream trace header at it', async () => {
		type Middleware = (
			next: (args: unknown) => Promise<unknown>,
			context: unknown
		) => (args: unknown) => Promise<unknown>
		let middleware: Middleware | undefined
		let options: Record<string, unknown> | undefined

		class FakeClient {
			middlewareStack = {
				add(added: Middleware, addedOptions: Record<string, unknown>) {
					middleware = added
					options = addedOptions
				},
			}
		}

		const getClient = globalClient(() => new FakeClient())
		getClient()

		// Before the SDK's recursion detection, which keeps a header that's there.
		expect(options).toMatchObject({ step: 'build', priority: 'high' })

		const request = { headers: {} as Record<string, string> }
		const handler = middleware!(async () => ({ output: { $metadata: { requestId: 'request-1', attempts: 2 } } }), {
			clientName: 'DynamoDBClient',
			commandName: 'QueryCommand',
		})

		await handler({ input: { TableName: 'app--stack--table--users' }, request })

		const [segment] = await daemon.received(1)

		expect(segment).toMatchObject({
			name: 'DynamoDB',
			namespace: 'aws',
			parent_id: LAMBDA_SEGMENT,
			aws: { operation: 'Query', table_name: 'app--stack--table--users', request_id: 'request-1', retries: 1 },
		})
		expect(request.headers['x-amzn-trace-id']).toBe(
			`Root=${ROOT};Parent=${segment!.id};Sampled=1;Lineage=a87bd80c:0`
		)
	})

	it('passes an unsampled decision on to the AWS call, without a span', async () => {
		let middleware:
			| ((next: () => Promise<unknown>, context: unknown) => (args: unknown) => Promise<unknown>)
			| undefined

		addTraceMiddleware({ middlewareStack: { add: (added: typeof middleware) => (middleware = added) } })

		const unsampled = `Root=${ROOT};Parent=${LAMBDA_SEGMENT};Sampled=0`
		const request = { headers: {} as Record<string, string> }

		await withTraceHeader(unsampled, () =>
			middleware!(async () => ({}), { clientName: 'LambdaClient', commandName: 'InvokeCommand' })({ request })
		)
		await flushTraces()
		await new Promise(resolve => setTimeout(resolve, 50))

		expect(request.headers['x-amzn-trace-id']).toBe(unsampled)
		expect(daemon.segments).toHaveLength(0)
	})

	it('marks a failed AWS call by its status', async () => {
		let middleware:
			| ((next: () => Promise<unknown>, context: unknown) => (args: unknown) => Promise<unknown>)
			| undefined

		addTraceMiddleware({ middlewareStack: { add: (added: typeof middleware) => (middleware = added) } })

		const throttled = Object.assign(new Error('Rate exceeded'), {
			name: 'ThrottlingException',
			$metadata: { httpStatusCode: 400 },
		})
		const handler = middleware!(() => Promise.reject(throttled), {
			clientName: 'SSMClient',
			commandName: 'GetParametersCommand',
		})

		await expect(handler({ request: { headers: {} } })).rejects.toBe(throttled)

		const [segment] = await daemon.received(1)

		expect(segment).toMatchObject({
			name: 'SSM',
			error: true,
			cause: { exceptions: [{ type: 'ThrottlingException' }] },
		})
		expect(segment).not.toHaveProperty('fault')
	})

	it('takes the invocation trace header over the environment', async () => {
		const invocationRoot = '1-6759e988-cd862e3fe1be46a994272794'

		await withTraceHeader(`Root=${invocationRoot};Parent=1111111111111111;Sampled=1`, () =>
			trace('stack:function:managed', () => 'value')
		)

		const [segment] = await daemon.received(1)

		expect(segment).toMatchObject({ trace_id: invocationRoot, parent_id: '1111111111111111' })
	})

	it('marks a throttled AWS call a throttle', async () => {
		let middleware:
			| ((next: () => Promise<unknown>, context: unknown) => (args: unknown) => Promise<unknown>)
			| undefined

		addTraceMiddleware({ middlewareStack: { add: (added: typeof middleware) => (middleware = added) } })

		const throttled = Object.assign(new Error('Throughput exceeds the limit'), {
			name: 'ProvisionedThroughputExceededException',
			$metadata: { httpStatusCode: 400 },
		})
		const handler = middleware!(() => Promise.reject(throttled), {
			clientName: 'DynamoDBClient',
			commandName: 'PutItemCommand',
		})

		await expect(handler({ request: { headers: {} } })).rejects.toBe(throttled)

		const [segment] = await daemon.received(1)

		expect(segment).toMatchObject({ name: 'DynamoDB', error: true, throttle: true })
	})

	describe('never fails a call', () => {
		it('logs a bad daemon address once and keeps answering', async () => {
			const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
			vi.stubEnv('AWS_XRAY_DAEMON_ADDRESS', '127.0.0.1:99999')

			expect(await trace('stack:function:one', () => 'first')).toBe('first')
			expect(await trace('stack:function:two', () => 'second')).toBe('second')
			await flushTraces()

			expect(warn).toHaveBeenCalledTimes(1)
			expect(warn.mock.calls[0]![0]).toBe('Tracing failed, spans are dropped:')
		})

		it('keeps the result when describing it throws', async () => {
			const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
			const result = await trace('stack:function:described', () => 'value', {
				endWith: () => {
					throw new Error('describer bug')
				},
			})

			expect(result).toBe('value')

			const [segment] = await daemon.received(1)

			expect(segment).toMatchObject({ name: 'stack:function:described' })
			expect(segment).not.toHaveProperty('fault')
			expect(warn).toHaveBeenCalledTimes(1)
		})

		it('rethrows the original error when describing it throws', async () => {
			vi.spyOn(console, 'warn').mockImplementation(() => {})
			const original = new RangeError('the real one')

			await expect(
				trace(
					'stack:function:failing',
					() => {
						throw original
					},
					{
						endWithError: () => {
							throw new Error('describer bug')
						},
					}
				)
			).rejects.toBe(original)

			const [segment] = await daemon.received(1)

			expect(segment).toMatchObject({ fault: true, cause: { exceptions: [{ type: 'RangeError' }] } })
		})

		it('passes the SDK answer and error through whatever their shape', async () => {
			let middleware:
				| ((next: () => Promise<unknown>, context: unknown) => (args: unknown) => Promise<unknown>)
				| undefined

			addTraceMiddleware({ middlewareStack: { add: (added: typeof middleware) => (middleware = added) } })

			const context = { clientName: 'SQSClient', commandName: 'SendMessageCommand' }

			await expect(middleware!(async () => undefined, context)({})).resolves.toBeUndefined()
			await expect(middleware!(() => Promise.reject(null), context)({})).rejects.toBeNull()
			await daemon.received(2)
		})

		it('leaves a client alone when its middleware stack refuses the tracer', () => {
			vi.spyOn(console, 'warn').mockImplementation(() => {})

			expect(() =>
				addTraceMiddleware({
					middlewareStack: {
						add() {
							throw new Error('Duplicate middleware name')
						},
					},
				})
			).not.toThrow()
		})
	})

	describe('fetch', () => {
		// Answers with the status in the path's first part, like /404/…
		const startServer = async () => {
			const server = createServer((request, response) => {
				const status = Number(request.url!.split('/')[1])
				setTimeout(() => response.writeHead(status).end('{}'), status === 200 ? 30 : 0)
			})

			await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))

			const { port } = server.address() as { port: number }

			return { origin: `http://127.0.0.1:${port}`, close: () => server.close() }
		}

		it('spans each request by its host, method and status alone, under its caller', async () => {
			const server = await startServer()

			// Inside an invocation, which starts fetch's spans.
			await withTraceHeader(undefined, () =>
				trace('stack:function:caller', async () => {
					// Started together: each ends its own span, whichever answers first.
					await Promise.all([
						fetch(`${server.origin}/200/users/user-1042@example.com?token=secret-token`),
						fetch(`${server.origin}/503/users/user-1042@example.com`, { method: 'POST', body: '{}' }),
					])
				})
			)

			server.close()

			const segments = await daemon.received(3)
			const caller = segments.find(segment => segment.name === 'stack:function:caller')!
			const ok = segments.find(segment => (segment.http as any)?.response?.status === 200)
			const down = segments.find(segment => (segment.http as any)?.response?.status === 503)

			expect(ok).toMatchObject({
				name: '127.0.0.1',
				namespace: 'remote',
				parent_id: caller.id,
				http: { request: { method: 'GET' }, response: { status: 200 } },
			})
			expect(ok).not.toHaveProperty('fault')
			expect(down).toMatchObject({ parent_id: caller.id, http: { request: { method: 'POST' } }, fault: true })
			expect(JSON.stringify(segments)).not.toMatch(/example\.com|secret-token|users/)
		})

		it('marks a refused connection a fault', async () => {
			const server = await startServer()
			server.close()

			await withTraceHeader(undefined, () =>
				trace('stack:function:offline', async () => {
					await expect(fetch(`${server.origin}/200`)).rejects.toThrow()
				})
			)

			const segments = await daemon.received(2)
			const request = segments.find(segment => segment.name === '127.0.0.1')

			expect(request).toMatchObject({ fault: true, cause: { exceptions: [{ type: expect.any(String) }] } })
		})

		it('sends no span for a fetch outside a traced invocation', async () => {
			const server = await startServer()
			vi.stubEnv('AWSLESS_TRACING', '')

			await fetch(`${server.origin}/200`)
			server.close()
			await flushTraces()
			await new Promise(resolve => setTimeout(resolve, 50))

			expect(daemon.segments).toHaveLength(0)
		})
	})
})
