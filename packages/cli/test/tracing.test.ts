import { getMeta } from '@terraforge/core'
import { describe, expect, it } from 'vitest'
import { createTestApp } from './_kit'

const code = { file: { nocheck: './echo.ts' } }

const createApp = (tracing?: boolean) => {
	return createTestApp({
		defaults: tracing === undefined ? {} : { function: { tracing } },
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

		expect(appConfig.function.tracing).toBe(false)
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
})
