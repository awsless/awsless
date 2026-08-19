import { mkdir, rm, writeFile } from 'fs/promises'
import { dirname, join } from 'path'
import { pathToFileURL } from 'url'
import { mockLambda } from '@awsless/lambda'
import { loadWorkspace } from '@awsless/ts-file-cache'
import { findInputDeps, getMeta } from '@terraforge/core'
import { formatRouteEnvName, getRouteEnv } from 'awsless'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildBundle, formatRouteKey, parseExportName } from '../src/feature/bundle/util'
import { createTestApp } from './_kit'

const fixture = (...path: string[]) => join(process.cwd(), 'test', '_fixture', ...path)

describe('bundle', () => {
	it('should format route keys', () => {
		expect(formatRouteKey('stack-1', 'function', 'helloWorld')).toBe('stack-1:function:hello-world')
		expect(formatRouteKey('Stack_2', 'site', 'web')).toBe('stack-2:site:web')
	})

	it('should scope resource env vars to a route', () => {
		const route = 'stack-1:image:avatar'
		const previousRoute = process.env.AWSLESS_ROUTE

		process.env.AWSLESS_ROUTE = route
		process.env[formatRouteEnvName(route, 'IMAGE_CONFIG')] = 'config'

		expect(getRouteEnv('IMAGE_CONFIG')).toBe('config')

		delete process.env[formatRouteEnvName(route, 'IMAGE_CONFIG')]
		if (previousRoute) {
			process.env.AWSLESS_ROUTE = previousRoute
		} else {
			delete process.env.AWSLESS_ROUTE
		}
	})

	it('should parse the export name from the handler prop', () => {
		expect(parseExportName('index.default')).toBe('default')
		expect(parseExportName('index.handle')).toBe('handle')
		expect(parseExportName('index')).toBe('default')
	})

	it('should keep the default lambda recursion protection', () => {
		const { app } = createTestApp()
		const recursion = app.resources.map(getMeta).find(meta => meta.type === 'aws_lambda_function_recursion_config')

		expect(recursion).toBeUndefined()
	})

	it('should preserve the Terraform-owned live alias while staging', () => {
		const { app } = createTestApp({ deploymentId: 'main-42' })
		const resources = app.resources.map(getMeta).filter(meta => meta.urn.includes(':function:{bundle}:'))
		const deployment = resources.find(meta => meta.type === 'deployment-alias')!
		const liveTarget = resources.find(meta => meta.type === 'live-target')!
		const alias = resources.find(meta => meta.type === 'aws_lambda_alias')!

		expect(deployment.input.id).toBe('main-42')
		expect(alias.input.name).toBe('live')
		expect(alias.logicalId).toBe('alias')
		expect(findInputDeps(alias.input.description)).toContain(liveTarget)
		expect(findInputDeps(alias.input.functionVersion)).toContain(liveTarget)
	})

	it('should configure the bundle with the function defaults', () => {
		const { app, appConfig } = createTestApp({
			defaults: {
				function: {
					memorySize: '256 MB',
					timeout: '20 seconds',
					minify: false,
				},
			},
		})
		const lambda = app.resources
			.map(getMeta)
			.find(meta => meta.type === 'aws_lambda_function' && meta.urn.includes(':function:{bundle}:'))

		expect(appConfig.function.minify).toBe(false)
		expect('bundle' in appConfig.function).toBe(false)
		expect(lambda?.input.memorySize).toBe(256)
		expect(lambda?.input.timeout).toBe(20)
	})

	it('should preserve side effect imports', { timeout: 60_000 }, async () => {
		const workspace = await loadWorkspace(process.cwd())
		const files: Record<string, string> = {}
		const builder = buildBundle({
			name: 'side-effect-test',
			runtime: join(process.cwd(), 'dist/handlers/bundle.js'),
			minify: false,
			handlers: [
				{
					routeKey: 'stack:function:test',
					file: fixture('bundle', 'side-effect-handler.ts'),
					exportName: 'default',
				},
			],
		})

		await builder(
			(_fingerprint, callback) =>
				callback(async (file, data) => {
					files[file] = data.toString()
				}),
			{ workspace }
		)

		const codes = Object.entries(files)
			.filter(([name]) => name.startsWith('files/') && !name.endsWith('.map'))
			.map(([, code]) => code)

		expect(codes.some(code => code.includes('SIDE_EFFECT_MARKER'))).toBe(true)
		expect(codes.some(code => code.includes('aws-sdk-vitest-mock'))).toBe(false)
	})
})

describe('bundle handler', () => {
	const functionName = 'app--function--bundle'
	const context = {
		invokedFunctionArn: `arn:aws:lambda:eu-west-1:123456789:function:${functionName}:live`,
	}

	const topicInvokes: [string, unknown][] = []
	const standaloneInvokes: unknown[] = []
	const dir = join(process.cwd(), '.awsless', 'temp', 'bundle-handler-test')
	let handler: (event: any, context: { invokedFunctionArn: string }) => Promise<unknown>

	mockLambda({
		[functionName]: payload => {
			topicInvokes.push([functionName, payload])
		},
		'test-app--unknown--function--route': payload => {
			standaloneInvokes.push(payload)

			return 'standalone-result'
		},
	})

	beforeAll(async () => {
		process.env.AWS_LAMBDA_FUNCTION_NAME = functionName

		await rm(dir, { recursive: true, force: true })
		await mkdir(dir, { recursive: true })

		const workspace = await loadWorkspace(process.cwd())
		const output = join(dir, 'output')
		const handlers = fixture('bundle', 'handlers.ts')
		const scoped = fixture('bundle', 'scoped.ts')
		const builder = buildBundle({
			name: 'bundle-handler-test',
			runtime: join(process.cwd(), 'dist/handlers/bundle.js'),
			minify: false,
			external: ['@awsless/lambda'],
			handlers: [
				{ routeKey: 'stack-1:function:echo', file: handlers, exportName: 'echo' },
				{ routeKey: 'stack-2:function:nested', file: handlers, exportName: 'nested' },
				{ routeKey: 'stack-1:function:parallel', file: handlers, exportName: 'parallel' },
				{ routeKey: 'stack-1:function:special', file: handlers, exportName: 'special' },
				{ routeKey: 'stack-1:function:error', file: handlers, exportName: 'errorResponse' },
				{ routeKey: 'stack-1:function:nested-error', file: handlers, exportName: 'nestedError' },
				{ routeKey: 'stack-1:function:app-name', file: handlers, exportName: 'app' },
				{ routeKey: 'stack-1:cron:tick', file: handlers, exportName: 'echo' },
				{ routeKey: 'stack-1:task:work', file: handlers, exportName: 'echo' },
				{ routeKey: 'stack-1:rpc:query', file: handlers, exportName: 'echo' },
				{ routeKey: 'base:rpc:api', file: handlers, exportName: 'site' },
				{ routeKey: 'stack-1:rest:api', file: handlers, exportName: 'site' },
				{ routeKey: 'stack-1:site:web', file: handlers, exportName: 'site' },
				{ routeKey: 'stack-1:route:page', file: handlers, exportName: 'site' },
				{ routeKey: 'stack-1:store:assets-created', file: handlers, exportName: 'queue' },
				{ routeKey: 'stack-1:table:users', file: handlers, exportName: 'queue' },
				{ routeKey: 'stack-1:icon:icons', file: handlers, exportName: 'site' },
				{ routeKey: 'stack-1:icon:icons-origin', file: handlers, exportName: 'echo' },
				{ routeKey: 'stack-1:image:images', file: handlers, exportName: 'site' },
				{ routeKey: 'stack-1:image:images-origin', file: handlers, exportName: 'echo' },
				{ routeKey: 'stack-1:metric:latency-0', file: handlers, exportName: 'queue' },
				{ routeKey: 'stack-1:queue:jobs', file: handlers, exportName: 'queue' },
				{ routeKey: 'stack-1:topic:event', file: handlers, exportName: 'topic' },
				{ routeKey: 'stack-2:topic:event', file: handlers, exportName: 'topic' },
				{ routeKey: 'stack-1:topic:constructor', file: handlers, exportName: 'topic' },
				{ routeKey: 'stack-1:topic:bad', file: handlers, exportName: 'badTopic' },
				{ routeKey: 'stack-1:function:scoped', file: scoped, exportName: 'default' },
				{ routeKey: 'stack-2:topic:scoped', file: scoped, exportName: 'default' },
				{ routeKey: 'stack-1:function:dependent', file: handlers, exportName: 'dependent' },
				{ routeKey: 'stack-2:function:dependent', file: handlers, exportName: 'dependent' },
			],
		})

		await builder(
			(_fingerprint, callback) =>
				callback(async (file, data) => {
					const path = join(output, file)

					await mkdir(dirname(path), { recursive: true })
					await writeFile(path, data)
				}),
			{ workspace }
		)

		process.env.PRESET_VALUE = 'real'
		delete process.env.FRESH_VALUE

		const files = join(output, 'files')
		await writeFile(
			join(files, 'awsless-env.mjs'),
			`export default { APP: 'test-app', GLOBAL_VALUE: 'global', PRESET_VALUE: 'bundled', FRESH_VALUE: 'bundled', 'stack-1:function:dependent:VALUE': 'one', 'stack-2:function:dependent:VALUE': 'two' }`
		)

		handler = (await import(`${pathToFileURL(join(files, 'index.mjs')).href}?${Date.now()}`)).default
	}, 60_000)

	afterAll(async () => {
		await rm(dir, { recursive: true, force: true })
	})

	it('should apply bundled env without overriding real Lambda env', () => {
		expect(process.env.APP).toBe('test-app')
		expect(process.env.GLOBAL_VALUE).toBe('global')
		expect(process.env.PRESET_VALUE).toBe('real')
		expect(process.env.FRESH_VALUE).toBe('bundled')
	})

	it('should apply bundled env before the runtime module scope runs', async () => {
		const result = await handler(
			{
				'$awsless-route': 'stack-1:function:app-name',
				event: {},
			},
			context
		)

		expect(result).toBe('test-app')
	})

	it('should dispatch the invoke envelope', async () => {
		const result = await handler(
			{
				'$awsless-route': 'stack-1:function:echo',
				event: { hello: 'world' },
			},
			context
		)

		expect(result).toStrictEqual({
			stack: 'stack-1',
			event: { hello: 'world' },
		})
	})

	it('should dispatch nested calls in-process and restore the route env', async () => {
		const result = await handler(
			{
				'$awsless-route': 'stack-2:function:nested',
				event: {},
			},
			context
		)

		expect(result).toStrictEqual({
			stack: 'stack-2',
			inner: { stack: 'stack-1', event: { from: 'nested' } },
		})
	})

	it('should isolate parallel nested route contexts', async () => {
		await expect(
			handler({ '$awsless-route': 'stack-1:function:parallel', event: {} }, context)
		).resolves.toStrictEqual([
			{
				stack: 'stack-1',
				route: 'stack-1:function:dependent',
				value: 'one',
			},
			{
				stack: 'stack-2',
				route: 'stack-2:function:dependent',
				value: 'two',
			},
		])
	})

	it('should preserve Lambda serialization for nested calls', async () => {
		await expect(
			handler({ '$awsless-route': 'stack-1:function:special', event: {} }, context)
		).resolves.toStrictEqual({
			stack: 'stack-1',
			event: {
				bigint: 123n,
				date: new Date('2026-01-02T03:04:05.000Z'),
			},
		})
	})

	it('should translate nested error responses', async () => {
		await expect(
			handler({ '$awsless-route': 'stack-1:function:nested-error', event: {} }, context)
		).rejects.toMatchObject({
			type: 'test',
			message: 'Expected failure',
		})
	})

	it('should scope reused handler modules to their route', async () => {
		await expect(handler({ '$awsless-route': 'stack-2:topic:scoped', event: {} }, context)).resolves.toStrictEqual({
			stack: 'stack-2',
			expected: '1',
		})
		await expect(
			handler({ '$awsless-route': 'stack-1:function:scoped', event: {} }, context)
		).resolves.toStrictEqual({
			stack: 'stack-1',
			expected: undefined,
		})
	})

	it('should resolve route env from shared dependencies at request time', async () => {
		await expect(
			handler({ '$awsless-route': 'stack-1:function:dependent', event: {} }, context)
		).resolves.toStrictEqual({
			stack: 'stack-1',
			route: 'stack-1:function:dependent',
			value: 'one',
		})
		await expect(
			handler({ '$awsless-route': 'stack-2:function:dependent', event: {} }, context)
		).resolves.toStrictEqual({
			stack: 'stack-2',
			route: 'stack-2:function:dependent',
			value: 'two',
		})
	})

	it.each([
		'stack-1:cron:tick',
		'stack-1:task:work',
		'stack-1:rpc:query',
		'stack-1:icon:icons-origin',
		'stack-1:image:images-origin',
	])('should dispatch the %s resource envelope', async route => {
		const event = { resource: route }
		const result = await handler({ '$awsless-route': route, event }, context)

		expect(result).toStrictEqual({ stack: 'stack-1', event })
		expect(process.env.THROW_EXPECTED_ERRORS).toBe(
			route.includes(':cron:') || route.includes(':task:') ? '1' : undefined
		)
	})

	it.each([['stack-1:topic:event', 'stack-1']])(
		'should dispatch the %s async resource envelope',
		async (route, stack) => {
			const event = { resource: route }
			const result = await handler({ '$awsless-route': route, event }, context)

			expect(result).toStrictEqual({
				stack,
				throwExpectedErrors: '1',
				event,
			})
		}
	)

	it.each([
		'stack-1:rest:api',
		'stack-1:site:web',
		'stack-1:route:page',
		'stack-1:icon:icons',
		'stack-1:image:images',
		'base:rpc:api',
	])('should dispatch the %s route header', async route => {
		const event = {
			headers: {
				'x-awsless-route': route,
				host: 'example.com',
			},
			rawPath: '/',
		}

		const result = await handler(event, context)

		expect(result).toStrictEqual(event)
	})

	it('should restore the viewer authorization header for web handlers', async () => {
		const event = {
			headers: {
				'x-awsless-route': 'stack-1:site:web',
				'x-awsless-authorization': 'Bearer viewer-token',
			},
		}

		const result = (await handler(event, context)) as typeof event & {
			headers: Record<string, string>
		}

		expect(result.headers.authorization).toBe('Bearer viewer-token')
		expect(result.headers['x-awsless-authorization']).toBeUndefined()
	})

	it.each([
		'stack-1:function:echo',
		'stack-1:cron:tick',
		'stack-1:metric:latency-0',
		'stack-1:queue:jobs',
		'stack-1:topic:event',
		'stack-1:task:work',
		'stack-1:store:assets-created',
		'stack-1:table:users',
	])('should not dispatch the %s internal resource from a route header', async route => {
		await expect(
			handler(
				{
					headers: {
						'x-awsless-route': route,
					},
				},
				context
			)
		).rejects.toThrow('Unknown bundle route')
	})

	it('should prefer an invoke envelope over a route header', async () => {
		const result = await handler(
			{
				'$awsless-route': 'stack-1:topic:event',
				event: { hello: 'world' },
				headers: {
					'x-awsless-route': 'stack-1:site:web',
				},
			},
			context
		)

		expect(result).toStrictEqual({
			stack: 'stack-1',
			throwExpectedErrors: '1',
			event: { hello: 'world' },
		})
	})

	it('should not fall back to a route header when an unknown envelope is present', async () => {
		await expect(
			handler(
				{
					'$awsless-route': 'unknown:resource:route',
					headers: {
						'x-awsless-route': 'stack-1:site:web',
					},
				},
				context
			)
		).rejects.toThrow('Unknown bundle route')
	})

	it.each([
		{
			name: 'queue',
			event: {
				Records: [
					{
						eventSource: 'aws:sqs',
						eventSourceARN: 'arn:aws:sqs:eu-west-1:123456789:test-app--stack-1--queue--jobs.fifo',
					},
				],
			},
		},
		{
			name: 'alarm',
			event: {
				source: 'aws.cloudwatch',
				alarmArn: 'arn:aws:cloudwatch:eu-west-1:123456789:alarm:test-app--stack-1--metric--latency-0',
			},
		},
		{
			name: 'store',
			event: {
				Records: [
					{
						eventSource: 'aws:s3',
						s3: { configurationId: 'stack-1:store:assets-created' },
					},
				],
			},
		},
		{
			name: 'table',
			event: {
				Records: [
					{
						eventSource: 'aws:dynamodb',
						eventSourceARN:
							'arn:aws:dynamodb:eu-west-1:123456789:table/test-app--stack-1--table--users/stream/2026-01-01T00:00:00.000',
					},
				],
			},
		},
	])('should route $name events', async ({ event }) => {
		await expect(handler(event, context)).resolves.toStrictEqual({
			stack: 'stack-1',
			throwExpectedErrors: '1',
			event,
		})
	})

	it('should fan out topic events to every subscriber', async () => {
		const event = {
			Records: [
				{
					EventSource: 'aws:sns',
					Sns: {
						TopicArn: 'arn:aws:sns:eu-west-1:123456789:test-app--topic--event',
						Message: 'hello',
					},
				},
			],
		}

		await handler(event, context)

		expect(topicInvokes).toStrictEqual([
			[functionName, { '$awsless-route': 'stack-1:topic:event', event }],
			[functionName, { '$awsless-route': 'stack-2:topic:event', event }],
		])
	})

	it('should route topic names that overlap object properties', async () => {
		const event = {
			Records: [
				{
					EventSource: 'aws:sns',
					Sns: {
						TopicArn: 'arn:aws:sns:eu-west-1:123456789:test-app--topic--constructor',
					},
				},
			],
		}

		await expect(handler(event, context)).resolves.toStrictEqual({
			stack: 'stack-1',
			throwExpectedErrors: '1',
			event,
		})
	})

	it('should forward unknown function routes to their stand-alone lambda', async () => {
		await expect(handler({ '$awsless-route': 'unknown:function:route', event: { n: 1 } }, context)).resolves.toBe(
			'standalone-result'
		)

		expect(standaloneInvokes).toStrictEqual([{ n: 1 }])
	})

	it('should throw for unknown routes', async () => {
		await expect(handler({ '$awsless-route': 'unknown:cron:route', event: {} }, context)).rejects.toThrow(
			'Unknown bundle route'
		)
	})

	it('should silently drop topics without subscribers', async () => {
		const before = topicInvokes.length
		const event = {
			Records: [
				{
					EventSource: 'aws:sns',
					Sns: {
						TopicArn: 'arn:aws:sns:eu-west-1:123456789:test-app--topic--nobody-listens',
						Message: 'hello',
					},
				},
			],
		}

		// Publishing to a topic without subscribers is a no-op on aws,
		// so the bundle drops it instead of erroring.
		await expect(handler(event, context)).resolves.toBeUndefined()
		expect(topicInvokes.length).toBe(before)
	})

	it('should rethrow for a single failing topic subscriber', async () => {
		const event = {
			Records: [
				{
					EventSource: 'aws:sns',
					Sns: {
						TopicArn: 'arn:aws:sns:eu-west-1:123456789:test-app--topic--bad',
						Message: 'hello',
					},
				},
			],
		}

		await expect(handler(event, context)).rejects.toThrow('solo subscriber')
	})
})
