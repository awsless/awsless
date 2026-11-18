import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises'
import { createServer } from 'http'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { StackConfig } from '../src/config/stack'
import { createDevSandboxes, SANDBOX_HEADER } from '../src/dev/sandbox'
import { createBlockedServer } from '../src/dev/servers/blocked'
import { createLambdaServer } from '../src/dev/servers/lambda'
import { createBundleWorker } from '../src/dev/worker'

const sandboxes = createDevSandboxes([
	{
		name: 'shop',
		functions: {
			open: {},
			closed: { sandbox: true },
			limited: {
				sandbox: { functions: ['shop:open'], tasks: ['shop:sendMail'], configs: ['API_KEY'] },
				permissions: [{ effect: 'allow', actions: ['sqs:SendMessage'], resources: ['*'] }],
			},
		},
	} as unknown as StackConfig,
])

// A stand-in bundle whose handler makes one signed AWS call as the given route.
const BUNDLE = `import http from 'node:http'
let route
export default async event => {
	route = event.route

	return new Promise((resolve, reject) => {
		const request = http.request(
			{
				hostname: '127.0.0.1',
				port: event.port,
				method: 'POST',
				path: event.path ?? '/',
				headers: {
					authorization:
						'AWS4-HMAC-SHA256 Credential=local/20260101/us-east-1/' + event.service + '/aws4_request, SignedHeaders=host, Signature=x',
				},
			},
			response => {
				let body = ''
				response.on('data', chunk => (body += chunk))
				response.on('end', () => resolve(JSON.parse(body)))
			}
		)

		request.on('error', reject)
		request.end(event.body ? JSON.stringify(event.body) : undefined)
	})
}
export const getCurrentRoute = () => route
`

describe('dev sandbox', () => {
	it('lists what every sandboxed function may reach, by its route', () => {
		expect(sandboxes).toStrictEqual({
			'shop:function:closed': { routes: [], configs: [], services: [] },
			'shop:function:limited': {
				routes: ['shop:function:open', 'shop:task:send-mail'],
				configs: ['api-key'],
				services: ['sqs'],
			},
		})
	})

	describe('aws calls', () => {
		let buildDir: string
		let worker: ReturnType<typeof createBundleWorker>
		let port: number

		const blocked = createBlockedServer({})
		const lambda = createLambdaServer({ functionName: 'bundle' })
		const invoked = vi.fn(async () => ({ invoked: true }))
		let blockedPort: number
		let lambdaPort: number
		const service = createServer((_, response) => response.end(JSON.stringify({ reached: true })))

		beforeAll(async () => {
			buildDir = await mkdtemp(join(tmpdir(), 'awsless-sandbox-'))
			await mkdir(join(buildDir, 'files'))
			await writeFile(join(buildDir, 'files', 'index.mjs'), BUNDLE)
			await new Promise<void>(resolve => service.listen(0, '127.0.0.1', resolve))

			port = (service.address() as { port: number }).port
			blockedPort = await blocked.listen()

			lambda.connect(invoked, undefined, sandboxes)
			lambdaPort = await lambda.listen()

			vi.stubEnv('AWSLESS_DEV_WORKERS', '1')

			worker = createBundleWorker({
				buildDir,
				env: {
					AWS_REGION: 'us-east-1',
					AWS_ACCOUNT_ID: '000000000000',
					AWS_ENDPOINT_URL: `http://127.0.0.1:${blockedPort}`,
					AWSLESS_DEV_SANDBOX: JSON.stringify(sandboxes),
				},
				functionName: 'test-bundle',
				quiet: () => true,
				onOutput: () => {},
				onCrash: () => {},
			})

			await worker.start()
		}, 30_000)

		afterAll(async () => {
			await worker.stop()
			await blocked.stop()
			await lambda.stop()
			service.close()
			await rm(buildDir, { recursive: true, force: true })
			vi.unstubAllEnvs()
		})

		it('denies a service the sandboxed function has no permission for', async () => {
			const result = await worker.dispatch({ route: 'shop:function:limited', service: 'dynamodb', port })

			expect(result).toMatchObject({
				__type: 'AccessDeniedException',
				message: expect.stringContaining('"shop:function:limited" is not authorized to call the "dynamodb"'),
			})
		})

		it('lets a service of its own permissions through', async () => {
			await expect(worker.dispatch({ route: 'shop:function:limited', service: 'sqs', port })).resolves.toEqual({
				reached: true,
			})
		})

		it("says a service it may call isn't emulated, not that it's denied", async () => {
			const result = await worker.dispatch({ route: 'shop:function:limited', service: 'sqs', port: blockedPort })

			expect(result).toMatchObject({ __type: 'NotEmulatedLocally' })
		})

		it('holds an invoke through the lambda emulator to the allowlist', async () => {
			const invoke = (route: string) => {
				return worker.dispatch({
					route: 'shop:function:limited',
					service: 'lambda',
					port: lambdaPort,
					path: '/2015-03-31/functions/bundle/invocations',
					body: { '$awsless-route': route, event: {} },
				})
			}

			expect(await invoke('shop:task:other')).toMatchObject({
				errorMessage: 'Sandboxed route is not allowed: shop:task:other',
			})
			expect(invoked).not.toHaveBeenCalled()

			expect(await invoke('shop:task:send-mail')).toEqual({ invoked: true })
		})

		it('leaves a function without a sandbox alone', async () => {
			await expect(worker.dispatch({ route: 'shop:function:open', service: 'dynamodb', port })).resolves.toEqual({
				reached: true,
			})
		})
	})

	describe('invokes through the lambda emulator', () => {
		const lambda = createLambdaServer({ functionName: 'bundle' })
		const dispatch = vi.fn(async () => ({ ok: true }))
		let port: number

		const invoke = async (route: string, caller?: string) => {
			const response = await fetch(`http://127.0.0.1:${port}/2015-03-31/functions/bundle/invocations`, {
				method: 'POST',
				headers: caller ? { [SANDBOX_HEADER]: caller } : {},
				body: JSON.stringify({ '$awsless-route': route, event: {} }),
			})

			return { error: response.headers.get('x-amz-function-error'), body: await response.json() }
		}

		beforeAll(async () => {
			lambda.connect(dispatch, undefined, sandboxes)
			port = await lambda.listen()
		})

		afterAll(() => lambda.stop())

		it('answers a route off the allowlist like the sandbox proxy', async () => {
			const result = await invoke('shop:task:other', 'shop:function:limited')

			expect(result.error).toBe('Unhandled')
			expect(result.body.errorMessage).toBe('Sandboxed route is not allowed: shop:task:other')
			expect(dispatch).not.toHaveBeenCalled()
		})

		it('dispatches an allowlisted route, and any route of other callers', async () => {
			await expect(invoke('shop:task:send-mail', 'shop:function:limited')).resolves.toMatchObject({ error: null })
			await expect(invoke('shop:task:other')).resolves.toMatchObject({ error: null })
			expect(dispatch).toHaveBeenCalledTimes(2)
		})
	})
})
