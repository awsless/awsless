import { ExpectedError, getContext } from '@awsless/lambda'
import { number, object, pipe, redact, string } from '@awsless/validate'
import { redactRouteInput, route } from '../src/lib/handle/route'

const event = (props: Record<string, unknown> = {}, method = 'GET') => ({
	rawPath: '/items/1',
	requestContext: {
		domainName: 'example.com',
		http: { method, path: '/items/1', sourceIp: '1.1.1.1', userAgent: 'test' },
	},
	...props,
})

const parseBody = (result: { body?: string }) => JSON.parse(result.body!)

describe('route request', () => {
	it('decodes x-param-* headers into params', async () => {
		const handle = route(({ params }) => Response.json(params))
		const result = await handle(event({ headers: { 'x-param-id': 'a%2Fb%20c' } }))

		expect(parseBody(result)).toStrictEqual({ id: 'a/b c' })
	})

	it('prefers real path parameters over headers', async () => {
		const handle = route(({ params }) => Response.json(params))
		const result = await handle(event({ pathParameters: { id: '1' }, headers: { 'x-param-id': '2' } }))

		expect(parseBody(result)).toStrictEqual({ id: '1' })
	})

	it('falls back to the raw query string', async () => {
		const handle = route({ query: object({ a: string(), b: string() }) }, ({ query }) => Response.json(query))
		const result = await handle(event({ rawQueryString: 'a=1&b=2' }))

		expect(parseBody(result)).toStrictEqual({ a: '1', b: '2' })
	})

	it('decodes base64 bodies', async () => {
		const handle = route({ body: object({ n: number() }) }, async ({ data, request }) => {
			return Response.json({ data, text: await request.text() })
		})
		const result = await handle(
			event({ body: Buffer.from('{"n":1}').toString('base64'), isBase64Encoded: true }, 'POST')
		)

		expect(parseBody(result)).toStrictEqual({ data: { n: 1 }, text: '{"n":1}' })
	})

	it('builds the url from the forwarded host', async () => {
		const handle = route(({ request }) => Response.json(request.url))
		const result = await handle(
			event({ headers: { 'x-forwarded-host': 'app.example.com' }, rawQueryString: 'a=1' })
		)

		expect(parseBody(result)).toBe('https://app.example.com/items/1?a=1')
	})
})

describe('route ip', () => {
	it.each([
		['198.51.100.10:46532', '198.51.100.10'],
		['2001:db8::8a2e:370:7334:46532', '2001:db8::8a2e:370:7334'],
	])('reads the cloudfront viewer address %s', async (address, ip) => {
		const handle = route(({ ip }) => Response.json({ ip }))
		const result = await handle(event({ headers: { 'cloudfront-viewer-address': address } }))

		expect(parseBody(result)).toStrictEqual({ ip })
	})

	it('falls back to the lambda source ip', async () => {
		const handle = route(({ ip }) => Response.json({ ip }))
		const result = await handle(event())

		expect(parseBody(result)).toStrictEqual({ ip: '1.1.1.1' })
	})
})

describe('route response', () => {
	it('converts a web response into a lambda url result', async () => {
		const handle = route(() => {
			const headers = new Headers({ 'content-type': 'text/plain', 'x-custom': 'yes' })
			headers.append('set-cookie', 'a=1')
			headers.append('set-cookie', 'b=2')

			return new Response('hello', { status: 201, headers })
		})

		const result = await handle(event())

		expect(result).toStrictEqual({
			statusCode: 201,
			headers: { 'content-type': 'text/plain', 'x-custom': 'yes' },
			cookies: ['a=1', 'b=2'],
			body: 'hello',
			isBase64Encoded: false,
		})
	})

	it('base64 encodes binary bodies', async () => {
		const handle = route(
			() => new Response(new Uint8Array([1, 2, 3]), { headers: { 'content-type': 'image/png' } })
		)
		const result = await handle(event())

		expect(result).toMatchObject({ body: 'AQID', isBase64Encoded: true })
	})

	it('leaves an empty body undefined', async () => {
		const handle = route(() => new Response(null, { status: 204 }))
		const result = await handle(event())

		expect(result).toMatchObject({ statusCode: 204, body: undefined, isBase64Encoded: false, cookies: undefined })
	})
})

describe('route errors', () => {
	it('renders validation errors as a 400', async () => {
		const handle = route({ body: object({ n: number() }) }, () => new Response('ok'))
		const result = await handle(event({ body: '{"n":"x"}' }, 'POST'))

		expect(result.statusCode).toBe(400)
		expect(result.headers).toStrictEqual({ 'content-type': 'application/json' })
		expect(parseBody(result)).toMatchObject({ type: 'validation' })
	})

	it('renders other expected errors as a 500', async () => {
		const handle = route(() => {
			throw new ExpectedError('not-found', 'No such item', { id: 1 })
		})
		const result = await handle(event())

		expect(result.statusCode).toBe(500)
		expect(parseBody(result)).toStrictEqual({ type: 'not-found', message: 'No such item', data: { id: 1 } })
	})

	it('propagates unexpected errors so the runtime logs them', async () => {
		const handle = route(() => {
			throw new Error('boom')
		})

		await expect(handle(event())).rejects.toThrow('boom')
	})
})

describe('route redaction', () => {
	const createRouteInput = (body?: string, headers: Record<string, string> = {}) => ({
		request: new Request('https://example.com/items/1?token=abc&page=2', { method: 'POST', headers, body }),
		params: { id: '1' },
		query: { token: 'abc', page: '2' },
		body,
		ip: '192.0.2.1',
	})

	it('leaves credentials and personal data out of a logged request', () => {
		const redacted = redactRouteInput({ body: object({ email: pipe(string(), redact()), plan: string() }) })(
			createRouteInput('{"email":"pat@example.com","plan":"free"}', {
				accept: '*/*',
				authorization: 'Bearer abc',
				'auth-api-key': 'sk_secret',
				cookie: 'a=b',
				'cloudfront-viewer-address': '192.0.2.1:443',
				'x-forwarded-for': '192.0.2.1',
				'zeno-visitor-ip': '192.0.2.1',
			})
		) as any

		expect(redacted.headers).toMatchObject({
			accept: '*/*',
			authorization: '[REDACTED]',
			'auth-api-key': '[REDACTED]',
			cookie: '[REDACTED]',
			'cloudfront-viewer-address': '[REDACTED]',
			'x-forwarded-for': '[REDACTED]',
			'zeno-visitor-ip': '[REDACTED]',
		})
		expect(redacted.query).toBe('token=%5BREDACTED%5D&page=2')
		expect(JSON.parse(redacted.body)).toStrictEqual({ email: '[REDACTED]', plan: 'free' })
		expect(redacted.ip).toBe('[REDACTED]')
	})

	it('leaves a secret path parameter out of the params & the path', () => {
		const redacted = redactRouteInput({})({
			request: new Request('https://example.com/unsubscribe/a%20b/weekly'),
			params: { token: 'a b', list: 'weekly' },
			query: {},
			ip: '192.0.2.1',
		}) as any

		expect(redacted.path).toBe('/unsubscribe/[REDACTED]/weekly')
		expect(redacted.params).toStrictEqual({ token: '[REDACTED]', list: 'weekly' })
	})

	it('redacts a body that isnt json whole', () => {
		expect((redactRouteInput({ body: object({ n: number() }) })(createRouteInput('password=x')) as any).body).toBe(
			'[REDACTED]'
		)
	})
})

describe('route event', () => {
	it('hands the cookies of a function url event over in the cookie header', async () => {
		const handle = route(({ request }) => Response.json({ cookie: request.headers.get('cookie') }))
		const result = await handle(event({ cookies: ['a=1', 'b=2'] }))

		expect(parseBody(result)).toStrictEqual({ cookie: 'a=1; b=2' })
	})

	it('joins a repeated query name like a function url, on both entries', async () => {
		const handle = route(({ query, url }) => Response.json({ query, path: url.pathname }))
		const eventResult = await handle(event({ rawQueryString: 'a=1&a=2&b=3' }))
		const fetchResponse = await handle.fetch(
			new Request('https://example.com/items/1?a=1&a=2&b=3', {
				headers: { 'cloudfront-viewer-address': '198.51.100.10:1234' },
			})
		)

		expect(parseBody(eventResult)).toStrictEqual({ query: { a: '1,2', b: '3' }, path: '/items/1' })
		expect(await fetchResponse.json()).toStrictEqual(parseBody(eventResult))
	})
})

describe('route fetch', () => {
	const createRequest = (body?: BodyInit, init: RequestInit = {}) =>
		new Request('https://example.com/items/1?a=1', {
			method: body ? 'POST' : 'GET',
			headers: { 'x-param-id': '1', 'cloudfront-viewer-address': '198.51.100.10:1234' },
			body,
			// oxlint-disable-next-line typescript/no-explicit-any -- undici's duplex isn't in the dom types
			...({ duplex: 'half' } as any),
			...init,
		})

	it('hands the handler the request with its params, query & ip', async () => {
		const handle = route(({ request, params, query, ip }) => Response.json({ url: request.url, params, query, ip }))
		const response = await handle.fetch(createRequest())

		expect(await response.json()).toStrictEqual({
			url: 'https://example.com/items/1?a=1',
			params: { id: '1' },
			query: { a: '1' },
			ip: '198.51.100.10',
		})
	})

	it('streams the request body to the handler & its response back', async () => {
		const chunks = ['a', 'b', 'c']
		const upload = new ReadableStream<Uint8Array>({
			pull(controller) {
				const chunk = chunks.shift()

				if (chunk) {
					controller.enqueue(new TextEncoder().encode(chunk))
				} else {
					controller.close()
				}
			},
		})

		const handle = route(({ request }) => {
			const reader = request.body!.getReader()

			return new Response(
				new ReadableStream({
					async pull(controller) {
						const chunk = await reader.read()

						if (chunk.done) {
							controller.close()
						} else {
							controller.enqueue(
								new TextEncoder().encode(new TextDecoder().decode(chunk.value).toUpperCase())
							)
						}
					},
				})
			)
		})

		const response = await handle.fetch(createRequest(upload))

		expect(await response.text()).toBe('ABC')
	})

	it('keeps the context open until the response stream ends', async () => {
		const events: string[] = []
		const handle = route(() => {
			getContext().onFinally(() => {
				events.push('finally')
			})

			return new Response(
				new ReadableStream({
					pull(controller) {
						// A later chunk is pulled by the reader, outside the handler's own call.
						if (events.length === 0) {
							events.push('first chunk')
							controller.enqueue(new TextEncoder().encode('x'))
							return
						}

						events.push(getContext().raw instanceof Request ? 'chunk' : 'no context')
						controller.enqueue(new TextEncoder().encode('y'))
						controller.close()
					},
				})
			)
		})

		const response = await handle.fetch(createRequest())

		expect(events).not.toContain('finally')
		expect(await response.text()).toBe('xy')
		expect(events).toStrictEqual(['first chunk', 'chunk', 'finally'])
	})

	it('keeps the context in a stream that reads after a pause', async () => {
		let hasSentFirstChunk = false
		const handle = route(() => {
			return new Response(
				new ReadableStream({
					async pull(controller) {
						if (!hasSentFirstChunk) {
							hasSentFirstChunk = true
							controller.enqueue(new TextEncoder().encode('first '))
							return
						}

						await new Promise(resolve => setTimeout(resolve, 10))
						controller.enqueue(new TextEncoder().encode(getContext().raw instanceof Request ? 'yes' : 'no'))
						controller.close()
					},
				})
			)
		})

		const response = await handle.fetch(createRequest())

		// Read later, outside the handler's own async context.
		await new Promise(resolve => setTimeout(resolve, 10))

		expect(await response.text()).toBe('first yes')
	})

	it('hands its success callbacks the response', async () => {
		const onSuccess = vi.fn()
		const handle = route(() => {
			getContext().onSuccess(onSuccess)

			return new Response('x')
		})

		const response = await handle.fetch(createRequest())

		await response.text()

		expect(onSuccess).toHaveBeenCalledWith(expect.any(Response))
	})

	it('answers an expected error from a success callback of a response without a body', async () => {
		const handle = route(() => {
			getContext().onSuccess(() => {
				throw new ExpectedError('conflict', 'Taken already')
			})

			return new Response(null, { status: 204 })
		})

		const response = await handle.fetch(createRequest())

		expect(response.status).toBe(500)
		expect(await response.json()).toMatchObject({ type: 'conflict', message: 'Taken already' })
	})

	it('fails a streamed body with the logged error of a success callback that fails', async () => {
		const handle = route(() => {
			getContext().onSuccess(() => {
				throw new Error('success callback')
			})

			return new Response('x')
		})

		const response = await handle.fetch(createRequest())

		await expect(response.text()).rejects.toMatchObject({
			message: 'success callback',
			input: { method: 'GET', ip: '[REDACTED]' },
		})
	})

	it('runs the failure callbacks of a stream that fails with undefined', async () => {
		const onFailure = vi.fn()
		const onSuccess = vi.fn()
		const handle = route(() => {
			getContext().onFailure(onFailure)
			getContext().onSuccess(onSuccess)

			return new Response(
				new ReadableStream({
					pull(controller) {
						controller.error(undefined)
					},
				})
			)
		})

		const response = await handle.fetch(createRequest())

		await expect(response.text()).rejects.toThrow()
		expect(onFailure).toHaveBeenCalledWith(undefined)
		expect(onSuccess).not.toHaveBeenCalled()
	})

	it('runs the finally callbacks when the caller goes away', async () => {
		const events: string[] = []
		const handle = route(() => {
			getContext().onFinally(() => {
				events.push('finally')
			})

			return new Response(new ReadableStream({ pull: () => new Promise(() => {}) }))
		})

		const response = await handle.fetch(createRequest())

		await response.body!.cancel()

		expect(events).toStrictEqual(['finally'])
	})

	it('ends the stream only once the finally callbacks are done', async () => {
		const events: string[] = []
		const handle = route(() => {
			getContext().onFinally(async () => {
				await new Promise(resolve => setTimeout(resolve, 10))
				events.push('finally')
			})

			return new Response('x')
		})

		const response = await handle.fetch(createRequest())

		await response.text()

		expect(events).toStrictEqual(['finally'])
	})

	it('runs the finally callbacks when cancelling the body fails', async () => {
		const events: string[] = []
		const handle = route(() => {
			getContext().onFinally(() => {
				events.push('finally')
			})

			return new Response(
				new ReadableStream({
					pull: () => new Promise(() => {}),
					cancel: () => Promise.reject(new Error('cancel failed')),
				})
			)
		})

		const response = await handle.fetch(createRequest())

		await response.body!.cancel().catch(() => {})

		expect(events).toStrictEqual(['finally'])
	})

	it('warns of a timeout while the body still streams', async () => {
		vi.useFakeTimers()
		const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
		const context = { getRemainingTimeInMillis: () => 1500 } as any
		const handle = route(() => new Response(new ReadableStream({ pull: () => new Promise(() => {}) })))

		await handle.fetch(createRequest(), context)
		await vi.advanceTimersByTimeAsync(1000)

		expect(errors).toHaveBeenCalledWith(
			expect.objectContaining({ message: expect.stringContaining('will timeout') })
		)

		errors.mockRestore()
		vi.useRealTimers()
	})

	it('reads a validated body from a copy, so the handler can read it too', async () => {
		const handle = route({ body: object({ n: number() }) }, async ({ data, request }) =>
			Response.json({ data, text: await request.text() })
		)
		const response = await handle.fetch(createRequest('{"n":1}'))

		expect(await response.json()).toStrictEqual({ data: { n: 1 }, text: '{"n":1}' })
	})
})
