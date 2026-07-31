import { getMeta } from '@terraforge/core'
import { describe, expect, it } from 'vitest'
import { FunctionSchema, StackFunctionSchema } from '../src/feature/function/schema'
import { isStandaloneFunction } from '../src/feature/function/util'
import { createTestApp } from './_kit'

const code = { file: { nocheck: './echo.ts' } }

describe('stack functions', () => {
	it('registers plain functions into the shared bundle', () => {
		const { app } = createTestApp({}, undefined, [
			{
				name: 'stack-1',
				functions: {
					echo: { code, handler: 'index.echo' },
				},
			},
		])

		const lambda = app.resources
			.map(getMeta)
			.find(meta => meta.type === 'aws_lambda_function' && meta.input.functionName === 'test-app--stack-1--function--echo')

		expect(lambda).toBeUndefined()
	})

	it('deploys functions with a custom config as stand-alone lambdas', () => {
		const { app } = createTestApp({}, undefined, [
			{
				name: 'stack-1',
				functions: {
					echo: {
						code,
						memorySize: '256 MB',
						reserved: 5,
						ephemeralStorageSize: '1 GB',
					},
				},
			},
		])

		const metas = app.resources.map(getMeta)
		const lambda = metas.find(
			meta => meta.type === 'aws_lambda_function' && meta.input.functionName === 'test-app--stack-1--function--echo'
		)!

		expect(lambda).toBeDefined()
		expect(lambda.input.memorySize).toBe(256)
		expect(lambda.input.reservedConcurrentExecutions).toBe(5)
		expect(lambda.input.ephemeralStorage).toEqual({ size: 1024 })

		// The bundle defaults are inherited.
		expect(lambda.input.timeout).toBe(900)
		expect(lambda.input.architectures).toEqual(['arm64'])
		expect(lambda.input.runtime).toBe('nodejs24.x')
		expect(lambda.input.handler).toBe('index.default')

		// Stand-alone functions deploy in place & stay out of blue-green.
		expect(lambda.input.publish).toBeUndefined()

		// Stand-alone functions live outside the vpc by default.
		expect(lambda.input.vpcConfig).toBeUndefined()

		const role = metas.find(meta => meta.type === 'aws_iam_role' && meta.input.description === 'test-app--stack-1--function--echo')
		const logGroup = metas.find(
			meta => meta.type === 'aws_cloudwatch_log_group' && meta.input.name === '/aws/lambda/test-app--stack-1--function--echo'
		)

		expect(role).toBeDefined()
		expect(logGroup).toBeDefined()
	})

	it('puts the full env on the lambda itself', () => {
		const { app } = createTestApp({}, undefined, [
			{
				name: 'stack-1',
				functions: {
					echo: { code, memorySize: '256 MB', environment: { CUSTOM: 'value' } },
				},
			},
		])

		const lambda = app.resources
			.map(getMeta)
			.find(
				meta => meta.type === 'aws_lambda_function' && meta.input.functionName === 'test-app--stack-1--function--echo'
			)!

		const variables = lambda.input.environment.variables

		expect(variables.STANDALONE).toBe('true')
		expect(variables.APP).toBe('test-app')
		expect(variables.APP_ID).toBeDefined()
		expect(variables.AWS_ACCOUNT_ID).toBe('123456789012')
		expect(variables.REGION).toBe('us-east-1')
		expect(variables.STAGE).toBe('default')
		expect(variables.STACK).toBe('stack-1')
		expect(variables.CUSTOM).toBe('value')

		// The stand-alone flag only exists inside the bundle env, so
		// the stand-alone lambda env stays free of routing data.
		expect(variables['stack-1:function:echo:STANDALONE']).toBeUndefined()
	})

	it('deploys inside the vpc when the function opts in', () => {
		const { app } = createTestApp({}, undefined, [
			{
				name: 'stack-1',
				functions: {
					echo: { code, memorySize: '256 MB', vpc: true },
				},
			},
		])

		const lambda = app.resources
			.map(getMeta)
			.find(
				meta => meta.type === 'aws_lambda_function' && meta.input.functionName === 'test-app--stack-1--function--echo'
			)!

		expect(lambda.input.vpcConfig).toBeDefined()
	})

})

describe('sandbox', () => {
	it('creates a sandbox proxy for the allowlisted routes', () => {
		const { app } = createTestApp({}, undefined, [
			{
				name: 'stack-1',
				functions: {
					echo: { code, sandbox: ['stack-1:function:other', 'stack-1:task:work'] },
					standalone: { code, memorySize: '256 MB' },
				},
				queues: {
					jobs: { consumer: { code } },
				},
			},
		])

		const metas = app.resources.map(getMeta)
		const lambda = metas.find(
			meta => meta.type === 'aws_lambda_function' && meta.input.functionName === 'test-app--stack-1--function--echo'
		)!
		const proxy = metas.find(
			meta =>
				meta.type === 'aws_lambda_function' &&
				meta.input.functionName === 'test-app--stack-1--function--echo-proxy'
		)!

		expect(proxy).toBeDefined()
		expect(proxy.input.environment.variables.SANDBOX_ROUTES).toBe(JSON.stringify(['stack-1:function:other', 'stack-1:task:work']))

		expect(lambda.input.environment.variables.SANDBOX_PROXY).toBe('test-app--stack-1--function--echo-proxy')
		expect(lambda.input.environment.variables.SANDBOX).toBe('true')
		expect(lambda.input.environment.variables.STANDALONE).toBeUndefined()

		// The app wide env stays out of the sandbox, only stand-alone
		// functions receive it.
		const standalone = metas.find(
			meta =>
				meta.type === 'aws_lambda_function' &&
				meta.input.functionName === 'test-app--stack-1--function--standalone'
		)!

		expect(lambda.input.environment.variables.QUEUE_STACK_1_JOBS_URL).toBeUndefined()
		expect(standalone.input.environment.variables.QUEUE_STACK_1_JOBS_URL).toBeDefined()
	})

	it('creates no proxy for a fully sandboxed function', () => {
		const { app } = createTestApp({}, undefined, [
			{
				name: 'stack-1',
				functions: {
					echo: { code, sandbox: true },
				},
			},
		])

		const metas = app.resources.map(getMeta)
		const lambda = metas.find(
			meta => meta.type === 'aws_lambda_function' && meta.input.functionName === 'test-app--stack-1--function--echo'
		)!
		const proxy = metas.find(
			meta =>
				meta.type === 'aws_lambda_function' &&
				meta.input.functionName === 'test-app--stack-1--function--echo-proxy'
		)

		expect(lambda).toBeDefined()
		expect(proxy).toBeUndefined()
		expect(lambda.input.environment.variables.SANDBOX_PROXY).toBeUndefined()
	})

	it('rejects invalid sandbox route keys', () => {
		expect(() => StackFunctionSchema.parse({ code, sandbox: ['not-a-route-key'] })).toThrow()
		expect(StackFunctionSchema.parse({ code, sandbox: ['stack:function:name'] })).toBeDefined()
		expect(StackFunctionSchema.parse({ code, sandbox: true })).toBeDefined()
	})
})

describe('isStandaloneFunction', () => {
	it('triggers on every lambda infra field', () => {
		expect(isStandaloneFunction(StackFunctionSchema.parse({ code }))).toBe(false)
		expect(isStandaloneFunction(StackFunctionSchema.parse({ code, handler: 'index.other' }))).toBe(false)
		expect(
			isStandaloneFunction(
				StackFunctionSchema.parse({
					code: { ...code, minify: false, external: ['pkg'], importAsString: ['*.html'], moduleSideEffects: ['./x/**'] },
				})
			)
		).toBe(false)

		// The vpc flag only applies to an already stand-alone lambda.
		expect(isStandaloneFunction(StackFunctionSchema.parse({ code, vpc: true }))).toBe(false)

		expect(isStandaloneFunction(StackFunctionSchema.parse({ code, memorySize: '256 MB' }))).toBe(true)
		expect(isStandaloneFunction(StackFunctionSchema.parse({ code, timeout: '30 seconds' }))).toBe(true)
		expect(isStandaloneFunction(StackFunctionSchema.parse({ code, log: false }))).toBe(true)
		expect(isStandaloneFunction(StackFunctionSchema.parse({ code, runtime: 'nodejs22.x' }))).toBe(true)
		expect(isStandaloneFunction(StackFunctionSchema.parse({ code, description: 'desc' }))).toBe(true)
		expect(isStandaloneFunction(StackFunctionSchema.parse({ code, architecture: 'x86_64' }))).toBe(true)
		expect(isStandaloneFunction(StackFunctionSchema.parse({ code, ephemeralStorageSize: '1 GB' }))).toBe(true)
		expect(isStandaloneFunction(StackFunctionSchema.parse({ code, reserved: 1 }))).toBe(true)
		expect(isStandaloneFunction(StackFunctionSchema.parse({ code, layers: [] }))).toBe(true)
		expect(isStandaloneFunction(StackFunctionSchema.parse({ code, environment: { A: 'b' } }))).toBe(true)
		expect(
			isStandaloneFunction(
				StackFunctionSchema.parse({ code, permissions: { actions: 's3:GetObject', resources: '*' } })
			)
		).toBe(true)
		expect(isStandaloneFunction(StackFunctionSchema.parse({ code, sandbox: true }))).toBe(true)
	})
})

describe('function schemas', () => {
	it('rejects unknown keys on stack functions', () => {
		expect(() => StackFunctionSchema.parse({ code, warm: 1 })).toThrow()
		expect(() => StackFunctionSchema.parse({ code, memory: '256 MB' })).toThrow()
	})

	it('keeps the consumer function schema narrow', () => {
		expect(() => FunctionSchema.parse({ code, memorySize: '256 MB' })).toThrow()
		expect(FunctionSchema.parse({ code, handler: 'index.other' })).toBeDefined()
	})
})
