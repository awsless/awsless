import { getMeta, resolveInputs } from '@terraforge/core'
import { describe, expect, it } from 'vitest'
import { BundledFunctionSchema, FunctionSchema, StackFunctionSchema } from '../src/feature/function/schema'
import { isStandaloneFunction } from '../src/feature/function/util'
import { createTestApp } from './_kit'

const code = { file: { nocheck: './echo.ts' } }

describe('stack functions', () => {
	it('registers plain functions into the shared bundle', () => {
		const { app } = createTestApp({
			stacks: [
				{
					name: 'stack-1',
					functions: {
						echo: { code, handler: 'index.echo' },
					},
				},
			],
		})

		const lambda = app.resources
			.map(getMeta)
			.find(
				meta =>
					meta.type === 'aws_lambda_function' &&
					meta.input.functionName === 'test-app--stack-1--function--echo'
			)

		expect(lambda).toBeUndefined()
	})

	it('deploys functions with a custom config as stand-alone lambdas', () => {
		const { app } = createTestApp({
			stacks: [
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
			],
		})

		const metas = app.resources.map(getMeta)
		const lambda = metas.find(
			meta =>
				meta.type === 'aws_lambda_function' && meta.input.functionName === 'test-app--stack-1--function--echo'
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

		// Stand-alone functions publish a version per deploy, so route
		// tables & the bundle env can pin them for blue-green.
		expect(lambda.input.publish).toBe(true)

		// Stand-alone functions live inside the vpc by default, just
		// like the shared bundle.
		expect(lambda.input.vpcConfig).toBeDefined()

		const role = metas.find(
			meta => meta.type === 'aws_iam_role' && meta.input.description === 'test-app--stack-1--function--echo'
		)
		const logGroup = metas.find(
			meta =>
				meta.type === 'aws_cloudwatch_log_group' &&
				meta.input.name === '/aws/lambda/test-app--stack-1--function--echo'
		)

		expect(role).toBeDefined()
		expect(logGroup).toBeDefined()
	})

	it('puts the full env on the lambda itself', () => {
		const { app } = createTestApp({
			stacks: [
				{
					name: 'stack-1',
					functions: {
						echo: { code, memorySize: '256 MB', environment: { CUSTOM: 'value' } },
					},
				},
			],
		})

		const lambda = app.resources
			.map(getMeta)
			.find(
				meta =>
					meta.type === 'aws_lambda_function' &&
					meta.input.functionName === 'test-app--stack-1--function--echo'
			)!

		const variables = lambda.input.environment.variables

		expect(variables.APP).toBe('test-app')
		expect(variables.APP_ID).toBeDefined()
		expect(variables.AWS_ACCOUNT_ID).toBe('123456789012')
		expect(variables.REGION).toBe('us-east-1')
		expect(variables.STAGE).toBe('default')
		expect(variables.STACK).toBe('stack-1')
		expect(variables.CUSTOM).toBe('value')
	})

	it('deploys outside the vpc when the function opts out', () => {
		const { app } = createTestApp({
			stacks: [
				{
					name: 'stack-1',
					functions: {
						echo: { code, memorySize: '256 MB', vpc: false },
					},
				},
			],
		})

		const lambda = app.resources
			.map(getMeta)
			.find(
				meta =>
					meta.type === 'aws_lambda_function' &&
					meta.input.functionName === 'test-app--stack-1--function--echo'
			)!

		expect(lambda.input.vpcConfig).toBeUndefined()
	})
})

describe('sandbox', () => {
	it('creates a sandbox proxy for the allowlisted routes', () => {
		const { app } = createTestApp({
			stacks: [
				{
					name: 'stack-1',
					functions: {
						echo: { code, sandbox: { functions: ['stack-1:other'], tasks: ['stack-1:work'] } },
						standalone: { code, memorySize: '256 MB' },
					},
					queues: {
						jobs: { consumer: { code } },
					},
				},
			],
		})

		const metas = app.resources.map(getMeta)
		const lambda = metas.find(
			meta =>
				meta.type === 'aws_lambda_function' && meta.input.functionName === 'test-app--stack-1--function--echo'
		)!
		const proxy = metas.find(
			meta =>
				meta.type === 'aws_lambda_function' &&
				meta.input.functionName === 'test-app--stack-1--function--echo-proxy'
		)!

		expect(proxy).toBeDefined()
		expect(proxy.input.environment.variables.SANDBOX_ROUTES).toBe(
			JSON.stringify(['stack-1:function:other', 'stack-1:task:work'])
		)

		expect(lambda.input.environment.variables.SANDBOX_PROXY).toBe('test-app--stack-1--function--echo-proxy')

		// The app wide env never lives in the lambda env, stand-alone
		// functions receive it baked into their code zip & sandboxed
		// functions don't receive it at all.
		const standalone = metas.find(
			meta =>
				meta.type === 'aws_lambda_function' &&
				meta.input.functionName === 'test-app--stack-1--function--standalone'
		)!

		expect(lambda.input.environment.variables.QUEUE_STACK_1_JOBS_URL).toBeUndefined()
		expect(standalone.input.environment.variables.QUEUE_STACK_1_JOBS_URL).toBeUndefined()
	})

	it('grants the sandbox access to the allowlisted configs', async () => {
		const { app } = createTestApp({
			stacks: [
				{
					name: 'stack-1',
					functions: {
						echo: { code, log: false, sandbox: { configs: ['secret'] } },
					},
				},
			],
		})

		const metas = app.resources.map(getMeta)
		const lambda = metas.find(
			meta =>
				meta.type === 'aws_lambda_function' && meta.input.functionName === 'test-app--stack-1--function--echo'
		)!

		expect(lambda.input.environment.variables.CONFIGS).toBe('secret')

		const policies = await Promise.all(
			metas
				.filter(meta => meta.type === 'aws_iam_role_policy')
				.map(meta => resolveInputs(meta.input.policy).catch(() => undefined))
		)

		const policy = policies.find(policy => String(policy).includes('parameter/.awsless/test-app/secret'))
		expect(policy).toBeDefined()
		expect(String(policy)).toContain('ssm:GetParameter')
	})

	it('creates no proxy for a fully sandboxed function', () => {
		const { app } = createTestApp({
			stacks: [
				{
					name: 'stack-1',
					functions: {
						echo: { code, sandbox: true },
					},
				},
			],
		})

		const metas = app.resources.map(getMeta)
		const lambda = metas.find(
			meta =>
				meta.type === 'aws_lambda_function' && meta.input.functionName === 'test-app--stack-1--function--echo'
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

	it('rejects invalid sandbox routes', () => {
		expect(() => StackFunctionSchema.parse({ code, sandbox: ['stack:function:name'] })).toThrow()
		expect(() => StackFunctionSchema.parse({ code, sandbox: { functions: ['not a route'] } })).toThrow()
		expect(() => StackFunctionSchema.parse({ code, sandbox: { queues: ['stack:name'] } })).toThrow()
		expect(() => StackFunctionSchema.parse({ code, sandbox: { configs: ['SECRET'] } })).toThrow()
		expect(StackFunctionSchema.parse({ code, sandbox: { functions: ['stack:name'] } })).toBeDefined()
		expect(StackFunctionSchema.parse({ code, sandbox: { tasks: ['stack:name'] } })).toBeDefined()
		expect(StackFunctionSchema.parse({ code, sandbox: { configs: ['secret'] } })).toBeDefined()
		expect(StackFunctionSchema.parse({ code, sandbox: true })).toBeDefined()
	})

	it('kebab-cases the sandbox routes to match the bundle route keys', () => {
		const { app } = createTestApp({
			stacks: [
				{
					name: 'stack-1',
					functions: {
						echo: { code, sandbox: { functions: ['stack-1:myFunc'], tasks: ['stack-1:myWork'] } },
					},
				},
			],
		})

		const proxy = app.resources
			.map(getMeta)
			.find(
				meta =>
					meta.type === 'aws_lambda_function' &&
					meta.input.functionName === 'test-app--stack-1--function--echo-proxy'
			)!

		expect(proxy.input.environment.variables.SANDBOX_ROUTES).toBe(
			JSON.stringify(['stack-1:function:my-func', 'stack-1:task:my-work'])
		)
	})
})

describe('isStandaloneFunction', () => {
	it('triggers on every lambda infra field', () => {
		expect(isStandaloneFunction(StackFunctionSchema.parse({ code }))).toBe(false)
		expect(isStandaloneFunction(StackFunctionSchema.parse({ code, handler: 'index.other' }))).toBe(false)
		expect(
			isStandaloneFunction(
				StackFunctionSchema.parse({
					code: {
						...code,
						minify: false,
						external: ['pkg'],
						importAsString: ['*.html'],
						moduleSideEffects: ['./x/**'],
					},
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

	it('keeps the bundled function schema narrow', () => {
		expect(() => BundledFunctionSchema.parse({ code, memorySize: '256 MB' })).toThrow()
		expect(BundledFunctionSchema.parse({ code, handler: 'index.other' })).toBeDefined()
	})

	it('accepts stand-alone lambda config on the handler function schema', () => {
		expect(FunctionSchema.parse({ code, memorySize: '256 MB', timeout: '30 seconds' })).toBeDefined()
		expect(() => FunctionSchema.parse({ code, sandbox: true })).toThrow()
	})
})
