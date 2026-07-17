import { GetObjectCommand, NoSuchKey, S3Client } from '@aws-sdk/client-s3'
import type { LambdaFunctionURLEvent } from 'aws-lambda'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPreviewHandler, PreviewRoute } from '../src/feature/bundle/server/preview'

const createEvent = (path: string, method = 'GET', headers: Record<string, string> = {}) => {
	return {
		rawPath: path,
		headers,
		requestContext: { http: { method } },
	} as unknown as LambdaFunctionURLEvent
}

const objects = new Map<string, { body: string; contentType: string }>()

const mockS3 = () => {
	return vi.spyOn(S3Client.prototype, 'send').mockImplementation(async (command: any) => {
		if (command instanceof GetObjectCommand) {
			const object = objects.get(`${command.input.Bucket}/${command.input.Key}`)

			if (!object) {
				throw new NoSuchKey({ message: 'NoSuchKey', $metadata: {} })
			}

			return {
				ContentType: object.contentType,
				ETag: '"abc"',
				Body: { transformToString: async () => Buffer.from(object.body).toString('base64') },
			}
		}

		throw new Error(`Unexpected S3 command: ${command.constructor.name}`)
	})
}

const routes: Record<string, PreviewRoute> = {
	'main:/*.': {
		type: 's3',
		domainName: 'site-bucket.s3.us-east-1.amazonaws.com',
		rewrite: { regex: '^/?(.*)$', to: '/v-abc/$1' },
	},
	'main:/about': {
		type: 's3',
		domainName: 'site-bucket.s3.us-east-1.amazonaws.com',
		rewrite: { to: '/v-abc/about.html' },
	},
	'main:/api/*': {
		type: 'lambda',
		requestHeaders: { 'x-awsless-route': 'stack:rpc:api' },
	},
}

describe('bundle preview handler', () => {
	afterEach(() => {
		vi.restoreAllMocks()
		objects.clear()
	})

	it('should serve s3 routes with their rewrites applied', async () => {
		mockS3()
		objects.set('site-bucket/v-abc/app.js', { body: 'console.log(1)', contentType: 'text/javascript' })
		objects.set('site-bucket/v-abc/about.html', { body: '<html/>', contentType: 'text/html' })

		const dispatch = vi.fn()
		const handler = createPreviewHandler({ router: 'main', routes, dispatch })

		const asset = (await handler(createEvent('/app.js'))) as any
		expect(asset.statusCode).toBe(200)
		expect(asset.headers['content-type']).toBe('text/javascript')
		expect(asset.isBase64Encoded).toBe(true)
		expect(Buffer.from(asset.body, 'base64').toString()).toBe('console.log(1)')

		const page = (await handler(createEvent('/about'))) as any
		expect(Buffer.from(page.body, 'base64').toString()).toBe('<html/>')

		expect(dispatch).not.toHaveBeenCalled()
	})

	it('should return 404 for a missing object or unknown path', async () => {
		mockS3()
		const handler = createPreviewHandler({ router: 'main', routes, dispatch: vi.fn() })

		const missing = (await handler(createEvent('/logo.svg'))) as any
		expect(missing.statusCode).toBe(404)

		const unknown = (await handler(createEvent('/unknown-page'))) as any
		expect(unknown.statusCode).toBe(404)
	})

	it('should dispatch lambda routes with the route header & tunneled authorization', async () => {
		const dispatch = vi.fn(async () => ({ statusCode: 200 }))
		const handler = createPreviewHandler({ router: 'main', routes, dispatch })
		const event = createEvent('/api/users', 'POST', { authorization: 'Bearer viewer' })

		await handler(event)

		expect(dispatch).toHaveBeenCalledWith(event)
		expect(event.headers['x-awsless-route']).toBe('stack:rpc:api')
		expect(event.headers['x-awsless-authorization']).toBe('Bearer viewer')
	})

	it('should drop a spoofed forwarded authorization header', async () => {
		const dispatch = vi.fn(async () => ({ statusCode: 200 }))
		const handler = createPreviewHandler({ router: 'main', routes, dispatch })
		const event = createEvent('/api/users', 'POST', { 'x-awsless-authorization': 'Bearer spoofed' })

		await handler(event)

		expect(event.headers['x-awsless-authorization']).toBeUndefined()
	})

	it('should not serve s3 routes for write methods', async () => {
		mockS3()
		const dispatch = vi.fn(async () => ({ statusCode: 200 }))
		const handler = createPreviewHandler({ router: 'main', routes, dispatch })

		// a POST to a static path falls through to the lambda catch-all, which doesn't exist here
		const result = (await handler(createEvent('/about', 'POST'))) as any
		expect(result.statusCode).toBe(404)
		expect(dispatch).not.toHaveBeenCalled()
	})

	it('should answer preflight requests directly', async () => {
		const handler = createPreviewHandler({ router: 'main', routes, dispatch: vi.fn() })
		const result = (await handler(createEvent('/api/users', 'OPTIONS'))) as any

		expect(result.statusCode).toBe(204)
		expect(result.headers['access-control-allow-origin']).toBe('*')
	})
})
