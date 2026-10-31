import { ExpectedError } from '@awsless/lambda'
import { number, object, pipe, redact, string } from '@awsless/validate'
import { redactEvent, route } from '../src/lib/handle/route'

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

describe('route ip', () => {
	it.each([
		['198.51.100.10:46532', '198.51.100.10'],
		['2001:db8::8a2e:370:7334:46532', '2001:db8::8a2e:370:7334'],
	])('reads the cloudfront viewer address %s', async (address, ip) => {
		const handle = route(request => Response.json({ ip: request.ip }))
		const result = await handle(event({ headers: { 'cloudfront-viewer-address': address } }))

		expect(parseBody(result)).toStrictEqual({ ip })
	})

	it('falls back to the lambda source ip', async () => {
		const handle = route(request => Response.json({ ip: request.ip }))
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

describe('route redaction', () => {
	it('leaves credentials and personal data out of a logged request', () => {
		const redacted = redactEvent({ body: object({ email: pipe(string(), redact()), plan: string() }) })(
			event(
				{
					headers: {
						accept: '*/*',
						authorization: 'Bearer abc',
						'auth-api-key': 'sk_secret',
						cookie: 'a=b',
						'cloudfront-viewer-address': '192.0.2.1:443',
						'x-forwarded-for': '192.0.2.1',
						'zeno-visitor-ip': '192.0.2.1',
					},
					cookies: ['a=b'],
					rawQueryString: 'token=abc&page=2',
					queryStringParameters: { token: 'abc', page: '2' },
					body: '{"email":"pat@example.com","plan":"free"}',
				},
				'POST'
			)
		) as any

		expect(redacted.headers).toStrictEqual({
			accept: '*/*',
			authorization: '[REDACTED]',
			'auth-api-key': '[REDACTED]',
			cookie: '[REDACTED]',
			'cloudfront-viewer-address': '[REDACTED]',
			'x-forwarded-for': '[REDACTED]',
			'zeno-visitor-ip': '[REDACTED]',
		})
		expect(redacted.cookies).toStrictEqual(['[REDACTED]'])
		expect(redacted.rawQueryString).toBe('token=%5BREDACTED%5D&page=2')
		expect(redacted.queryStringParameters).toStrictEqual({ token: '[REDACTED]', page: '2' })
		expect(JSON.parse(redacted.body)).toStrictEqual({ email: '[REDACTED]', plan: 'free' })
		expect(redacted.requestContext.http.sourceIp).toBe('[REDACTED]')
	})

	it('redacts a body without a schema by its field names', () => {
		const redacted = redactEvent({})(
			event({
				body: JSON.stringify({
					externalId: 'user-1042',
					envelope: { ip: '192.0.2.1', headers: { cookie: 'a=b' } },
					user: { firstName: 'Pat', password: 'x', membership: 'owner' },
					visitorIp: '192.0.2.1',
				}),
			})
		) as any

		expect(JSON.parse(redacted.body)).toStrictEqual({
			externalId: 'user-1042',
			envelope: { ip: '[REDACTED]', headers: { cookie: '[REDACTED]' } },
			user: { firstName: '[REDACTED]', password: '[REDACTED]', membership: 'owner' },
			visitorIp: '[REDACTED]',
		})
	})

	it('redacts a body that isnt json whole', () => {
		expect((redactEvent({})(event({ body: 'password=x' })) as any).body).toBe('[REDACTED]')
	})
})
