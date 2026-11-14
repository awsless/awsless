import { createHttpClient, createHttpFetcher } from '../src/lib/client/http'

describe('HTTP client', () => {
	afterEach(() => {
		vi.unstubAllGlobals()
	})

	it('should address the route and send the body as json', async () => {
		const fetch = vi.fn(async (..._args: [URL, RequestInit]) => new Response(JSON.stringify({ ok: true })))
		vi.stubGlobal('fetch', fetch)

		const body = { hello: 'world' }
		await createHttpFetcher('https://example.com/base/')({
			method: 'POST',
			path: '/api/items',
			headers: new Headers(),
			body,
		})

		const [url, init] = fetch.mock.calls[0]!
		const payload = JSON.stringify(body)
		const headers = init.headers as Headers

		expect(url.toString()).toBe('https://example.com/api/items')
		expect(init.body).toBe(payload)
		expect(headers.get('content-type')).toBe('application/json')
		// The routes run on the Lambda Web Function, which takes a body unsigned.
		expect(headers.has('x-amz-content-sha256')).toBe(false)
	})

	it('should send a POST without a body', async () => {
		const fetch = vi.fn(async (..._args: [URL, RequestInit]) => new Response(JSON.stringify({ ok: true })))
		vi.stubGlobal('fetch', fetch)

		await createHttpFetcher('https://example.com')({
			method: 'POST',
			path: '/action',
			headers: new Headers(),
		})

		const [, init] = fetch.mock.calls[0]!
		const headers = init.headers as Headers

		expect(init.body).toBeUndefined()
		expect(headers.has('x-amz-content-sha256')).toBe(false)
	})

	it('should replace route parameters', async () => {
		const fetcher = vi.fn(async () => ({ ok: true }))
		const client = createHttpClient<{
			GET: {
				'/items/{item-2}': {
					param: { 'item-2': string }
					response: { ok: boolean }
				}
			}
		}>(fetcher)

		await client.get('/items/{item-2}', { params: { 'item-2': '42' } })

		expect(fetcher).toHaveBeenCalledWith(expect.objectContaining({ path: '/items/42' }))
	})
})
