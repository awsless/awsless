import { ExpectedError } from '@awsless/lambda'
import { number, object, string } from '@awsless/validate'
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
		const handle = route(request => Response.json(request.params))
		const result = await handle(event({ headers: { 'x-param-id': 'a%2Fb%20c' } }))

		expect(parseBody(result)).toStrictEqual({ id: 'a/b c' })
	})

	it('prefers real path parameters over headers', async () => {
		const handle = route(request => Response.json(request.params))
		const result = await handle(event({ pathParameters: { id: '1' }, headers: { 'x-param-id': '2' } }))

		expect(parseBody(result)).toStrictEqual({ id: '1' })
	})

	it('falls back to the raw query string', async () => {
		const handle = route({ query: object({ a: string(), b: string() }) }, request => Response.json(request.query))
		const result = await handle(event({ rawQueryString: 'a=1&b=2' }))

		expect(parseBody(result)).toStrictEqual({ a: '1', b: '2' })
	})

	it('decodes base64 bodies', async () => {
		const handle = route({ body: object({ n: number() }) }, request => {
			return Response.json({ data: request.data, text: request.text() })
		})
		const result = await handle(
			event({ body: Buffer.from('{"n":1}').toString('base64'), isBase64Encoded: true }, 'POST')
		)

		expect(parseBody(result)).toStrictEqual({ data: { n: 1 }, text: '{"n":1}' })
	})

	it('builds the url from the forwarded host', async () => {
		const handle = route(request => Response.json(request.url.toString()))
		const result = await handle(
			event({ headers: { 'x-forwarded-host': 'app.example.com' }, rawQueryString: 'a=1' })
		)

		expect(parseBody(result)).toBe('https://app.example.com/items/1?a=1')
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

	it('passes lambda url results through', async () => {
		const handle = route(() => ({ statusCode: 302, headers: { location: '/' } }))

		await expect(handle(event())).resolves.toStrictEqual({ statusCode: 302, headers: { location: '/' } })
	})
})

// The route contract is http, so expected errors render the same way
// in test mode (where the lambda wrapper throws them) & in production
// (where it returns them).
describe.each([
	['test mode', 'test'],
	['production', 'production'],
])('route errors in %s', (_, env) => {
	beforeEach(() => {
		vi.stubEnv('LAMBDA_ENV', env)
	})

	afterEach(() => {
		vi.unstubAllEnvs()
	})

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
