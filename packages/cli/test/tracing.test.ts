import { getMeta } from '@terraforge/core'
import { describe, expect, it } from 'vitest'
import { createTestApp } from './_kit'

const code = { file: { nocheck: './echo.ts' } }

const createApp = (tracing?: boolean) => {
	return createTestApp({
		app: { topics: ['signup'], ...(tracing === undefined ? {} : { tracing }) },
		stacks: [{ name: 'stack-1', functions: { echo: { code, memorySize: '256 MB' } } }],
	})
}

const findLambdas = (app: ReturnType<typeof createApp>['app']) => {
	const metas = app.resources.map(getMeta)
	const lambdaOf = (name: string) =>
		metas.find(meta => meta.type === 'aws_lambda_function' && meta.input.functionName === name)!

	return {
		metas,
		bundle: metas.find(meta => meta.type === 'aws_lambda_function' && meta.urn.includes(':bundle:{event}:'))!,
		standalone: lambdaOf('test-app--stack-1--function--echo'),
	}
}

describe('tracing', () => {
	it('is off by default', () => {
		const { appConfig, app } = createApp()
		const { metas, bundle, standalone } = findLambdas(app)

		expect(appConfig.tracing).toBe(false)
		expect(bundle.input.tracingConfig).toEqual({ mode: 'PassThrough' })
		expect(standalone.input.tracingConfig).toEqual({ mode: 'PassThrough' })
		expect(bundle.input.environment.variables).not.toHaveProperty('AWSLESS_TRACING')
		expect(metas.some(meta => meta.input?.name === 'lambda-tracing-policy')).toBe(false)
	})

	it('turns on active tracing for the bundle and the stand-alone lambdas', () => {
		const { app } = createApp(true)
		const { metas, bundle, standalone } = findLambdas(app)

		expect(bundle.input.tracingConfig).toEqual({ mode: 'Active' })
		expect(standalone.input.tracingConfig).toEqual({ mode: 'Active' })
		expect(bundle.input.environment.variables.AWSLESS_TRACING).toBe('true')
		expect(standalone.input.environment.variables.AWSLESS_TRACING).toBe('true')

		// Lambda refuses active tracing to a role that can't send segments yet.
		const tracingPolicy = metas.find(meta => meta.input?.name === 'lambda-tracing-policy')!
		expect(JSON.parse(tracingPolicy.input.policy).Statement[0].Action).toEqual([
			'xray:PutTraceSegments',
			'xray:PutTelemetryRecords',
		])
		expect(bundle.dependencies).toContain(tracingPolicy.urn)
	})

	it('has each topic record its own segments, with the right for SNS to send them', () => {
		const findTopic = (app: ReturnType<typeof createApp>['app']) => {
			const metas = app.resources.map(getMeta)

			return {
				topic: metas.find(
					meta => meta.type === 'aws_sns_topic' && meta.input.name === 'test-app--topic--signup'
				)!,
				policy: metas.find(meta => meta.type === 'aws_xray_resource_policy'),
			}
		}

		const off = findTopic(createApp().app)
		expect(off.topic.input.tracingConfig).toBe('PassThrough')
		expect(off.policy).toBeUndefined()

		const on = findTopic(createApp(true).app)
		expect(on.topic.input.tracingConfig).toBe('Active')
		expect(on.topic.dependencies).toContain(on.policy!.urn)

		const [statement] = JSON.parse(on.policy!.input.policyDocument).Statement
		expect(statement.Principal).toEqual({ Service: 'sns.amazonaws.com' })
		expect(statement.Action).toContain('xray:PutTraceSegments')
		expect(statement.Condition.StringLike['aws:SourceArn']).toMatch(/:test-app--topic--\*$/)
	})

	it('takes a sample rate, which the routers decide by', () => {
		const { appConfig, app } = createTestApp({
			app: { tracing: { sampleRate: 0.005 } },
			defaults: { router: { main: {} } },
			stacks: [{ name: 'stack-1', functions: { echo: { code, memorySize: '256 MB' } } }],
		})
		const metas = app.resources.map(getMeta)
		const routerFunction = metas.find(meta => meta.type === 'aws_cloudfront_function')!

		expect(appConfig.tracing).toEqual({ sampleRate: 0.005 })
		expect(routerFunction.input.code).toContain('Math.random()<0.005')
		expect(findLambdas(app).bundle.input.tracingConfig).toEqual({ mode: 'Active' })
		expect(() => createTestApp({ app: { tracing: { sampleRate: 2 } } })).toThrow()
	})
})
