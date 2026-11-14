import { ExpectedError, getContext } from '@awsless/lambda'
import { route } from '../src/lib/handle/route'

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

	it('keeps a param with a broken escape as written', async () => {
		const handle = route(({ params }) => Response.json(params))
		const result = await handle(event({ headers: { 'x-param-id': '%E0%A4' } }))

		expect(result.statusCode).toBe(200)
		expect(parseBody(result)).toStrictEqual({ id: '%E0%A4' })
	})

	it('prefers real path parameters over headers', async () => {
		const handle = route(({ params }) => Response.json(params))
		const result = await handle(event({ pathParameters: { id: '1' }, headers: { 'x-param-id': '2' } }))

		expect(parseBody(result)).toStrictEqual({ id: '1' })
	})

	it('falls back to the raw query string', async () => {
		const handle = route(({ request }) => Response.json(Object.fromEntries(new URL(request.url).searchParams)))
		const result = await handle(event({ rawQueryString: 'a=1&b=2' }))

		expect(parseBody(result)).toStrictEqual({ a: '1', b: '2' })
	})

	it('decodes base64 bodies', async () => {
		const handle = route(async ({ request }) => Response.json({ text: await request.text() }))
		const result = await handle(
			event({ body: Buffer.from('{"n":1}').toString('base64'), isBase64Encoded: true }, 'POST')
		)

		expect(parseBody(result)).toStrictEqual({ text: '{"n":1}' })
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
		const handle = route(() => {
			throw new ExpectedError('validation', 'Invalid body')
		})
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

describe('route log', () => {
	it('logs the method & path of a failed request, never its headers, query, body or ip', async () => {
		const handle = route(() => {
			throw new Error('boom')
		})
		const request = new Request('https://example.com/items/1?token=abc', {
			method: 'POST',
			headers: { authorization: 'Bearer abc', 'cloudfront-viewer-address': '192.0.2.1:443' },
			body: '{"email":"pat@example.com"}',
		})

		await expect(handle.fetch(request)).rejects.toMatchObject({
			message: 'boom',
			input: { method: 'POST', path: '/items/1' },
		})
		await expect(handle.fetch(request.clone())).rejects.toSatisfy(
			(error: { input: object }) => Object.keys(error.input).join() === 'method,path'
		)
	})
})

describe('route event', () => {
	it('hands the cookies of a function url event over in the cookie header', async () => {
		const handle = route(({ request }) => Response.json({ cookie: request.headers.get('cookie') }))
		const result = await handle(event({ cookies: ['a=1', 'b=2'] }))

		expect(parseBody(result)).toStrictEqual({ cookie: 'a=1; b=2' })
	})

	it('hands both entries the same path & query', async () => {
		const handle = route(({ request }) => Response.json(request.url.slice(request.url.indexOf('/items'))))
		const eventResult = await handle(event({ rawQueryString: 'a=1&a=2&b=3' }))
		const fetchResponse = await handle.fetch(
			new Request('https://example.com/items/1?a=1&a=2&b=3', {
				headers: { 'cloudfront-viewer-address': '198.51.100.10:1234' },
			})
		)

		expect(parseBody(eventResult)).toBe('/items/1?a=1&a=2&b=3')
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

	it('hands the handler the request with its params & ip', async () => {
		const handle = route(({ request, params, ip }) => Response.json({ url: request.url, params, ip }))
		const response = await handle.fetch(createRequest())

		expect(await response.json()).toStrictEqual({
			url: 'https://example.com/items/1?a=1',
			params: { id: '1' },
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
			input: { method: 'GET', path: '/items/1' },
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
})
