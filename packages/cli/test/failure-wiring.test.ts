import { describe, expect, it } from 'vitest'
import { createTestApp, listResources } from './_kit'

const createFailureApp = () =>
	createTestApp({
		app: {
			onFailure: { consumer: { code: { file: { nocheck: './on-failure.ts' } } } },
			onErrorLog: { code: { file: { nocheck: './on-error-log.ts' } } },
		},
		stacks: [{ name: 'stack-1', functions: { echo: { code: { file: { nocheck: './echo.ts' } }, memorySize: '256 MB' } } }],
	})

describe('on-failure & on-error-log wiring', () => {
	it('subscribes the on-failure handler log group to the error log', () => {
		const result = createFailureApp()

		result.ready()

		const filters = listResources(result.app, 'aws_cloudwatch_log_subscription_filter')
		const onFailure = filters.filter(meta => meta.urn.includes('on-failure:{main}'))
		const onErrorLog = filters.filter(meta => meta.urn.includes('on-error-log:{main}'))
		const echo = filters.filter(meta => meta.urn.includes('function:{echo}'))

		expect(onFailure).toHaveLength(1)
		expect(echo).toHaveLength(1)

		// The error log handler never consumes its own logs.
		expect(onErrorLog).toHaveLength(0)
	})

	it('only subscribes the on-failure handler once ready', () => {
		const result = createFailureApp()

		expect(
			listResources(result.app, 'aws_cloudwatch_log_subscription_filter').filter(meta =>
				meta.urn.includes('on-failure:{main}')
			)
		).toHaveLength(0)
	})

	it('reports the async failures of the error log handler to the on-failure bucket', () => {
		const result = createFailureApp()

		const configs = listResources(result.app, 'aws_lambda_function_event_invoke_config')
		const onErrorLog = configs.filter(meta => meta.urn.includes('on-error-log:{main}'))
		const onFailure = configs.filter(meta => meta.urn.includes('on-failure:{main}'))

		expect(onErrorLog).toHaveLength(1)

		// The on-failure handler never feeds its own failures back into
		// the bucket it consumes.
		expect(onFailure).toHaveLength(0)
	})
})
