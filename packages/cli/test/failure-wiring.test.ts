import { findInputDeps } from '@terraforge/core'
import { describe, expect, it } from 'vitest'
import { createTestApp, listResources } from './_kit'

type Meta = ReturnType<typeof listResources>[number]

const code = { file: { nocheck: './handler.ts' } }

const createFailureApp = (stack: Record<string, unknown> = {}) =>
	createTestApp({
		app: {
			onFailure: { consumer: { code: { file: { nocheck: './on-failure.ts' } } } },
			onErrorLog: { code: { file: { nocheck: './on-error-log.ts' } } },
		},
		stacks: [
			{
				name: 'stack-1',
				functions: { echo: { code: { file: { nocheck: './echo.ts' } }, memorySize: '256 MB' } },
				...stack,
			},
		],
	})

// The delivery graph of the failure plane: who a lambda's logs and
// failures reach, and what feeds a handler. Every edge is read off the
// synthed resources, so the wiring can't drift from the assertion.
const failureGraph = (metas: Meta[]) => {
	const edges = new Map<string, Set<string>>()
	const link = (from: Meta | undefined, to: Meta | undefined) => {
		if (from && to) {
			edges.set(from.urn, (edges.get(from.urn) ?? new Set()).add(to.urn))
		}
	}

	const depOf = (input: unknown, type: string) => findInputDeps(input).find(dep => dep.type === type)
	const lambdaOf = (input: unknown) => {
		// Consumers may hang off an alias instead of the function itself.
		const alias = depOf(input, 'aws_lambda_alias')

		return alias ? depOf(alias.input.functionName, 'aws_lambda_function') : depOf(input, 'aws_lambda_function')
	}
	const destinationOf = (input: unknown) => depOf(input, 'aws_s3_bucket') ?? depOf(input, 'aws_sqs_queue')

	for (const meta of metas) {
		switch (meta.type) {
			case 'aws_lambda_function':
				link(
					meta,
					metas.find(
						entry =>
							entry.type === 'aws_cloudwatch_log_group' &&
							entry.input.name === meta.input.loggingConfig?.logGroup
					)
				)
				break
			case 'aws_cloudwatch_log_subscription_filter':
				link(depOf(meta.input.logGroupName, 'aws_cloudwatch_log_group'), lambdaOf(meta.input.destinationArn))
				break
			case 'aws_lambda_function_event_invoke_config':
				link(
					lambdaOf(meta.input.functionName),
					destinationOf(meta.input.destinationConfig?.onFailure?.destination)
				)
				break
			case 'deployment-alias':
				link(lambdaOf(meta.input.functionName), destinationOf(meta.input.onFailureArn))
				break
			case 'aws_s3_bucket_notification':
				for (const target of meta.input.queue ?? []) {
					link(depOf(meta.input.bucket, 'aws_s3_bucket'), depOf(target.queueArn, 'aws_sqs_queue'))
				}
				break
			case 'aws_lambda_event_source_mapping':
				link(depOf(meta.input.eventSourceArn, 'aws_sqs_queue'), lambdaOf(meta.input.functionName))
				break
			case 'aws_sqs_queue':
				link(meta, depOf(meta.input.redrivePolicy, 'aws_sqs_queue'))
				break
		}
	}

	return edges
}

const findCycle = (edges: Map<string, Set<string>>, start: string) => {
	const seen = new Set<string>()
	const walk = (node: string, path: string[]): string[] | undefined => {
		for (const next of edges.get(node) ?? []) {
			if (next === start) {
				return [...path, next]
			}

			if (!seen.has(next)) {
				seen.add(next)
				const cycle = walk(next, [...path, next])

				if (cycle) {
					return cycle
				}
			}
		}

		return
	}

	return walk(start, [start])
}

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

	it('reports the async failures of the error log handler to the on-failure deadletter', () => {
		const result = createFailureApp()

		const configs = listResources(result.app, 'aws_lambda_function_event_invoke_config')
		const onErrorLog = configs.filter(meta => meta.urn.includes('on-error-log:{main}'))
		const onFailure = configs.filter(meta => meta.urn.includes('on-failure:{main}'))
		const deadletter = listResources(result.app, 'aws_sqs_queue').find(
			meta => meta.input.name === 'test-app--on-failure--deadletter'
		)!

		expect(onErrorLog).toHaveLength(1)
		expect(findInputDeps(onErrorLog[0]!.input.destinationConfig.onFailure.destination)).toContain(deadletter)

		// The on-failure handler never feeds its own failures back into
		// the bucket it consumes.
		expect(onFailure).toHaveLength(0)
	})

	it('grants the error log handler the deadletter send', () => {
		const result = createFailureApp()
		const policy = listResources(result.app, 'aws_iam_role_policy').find(
			meta =>
				meta.input.name === 'lambda-policy' &&
				findInputDeps(meta.input.role).some(dep => dep.input.description === 'test-app--on-error-log--handler')
		)!
		const queues = findInputDeps(policy.input.policy)
			.filter(dep => dep.type === 'aws_sqs_queue')
			.map(dep => dep.input.name)

		expect(queues).toEqual(['test-app--on-failure--deadletter'])
	})

	it('reports from the live alias of a versioned lambda & from the bare handler otherwise', () => {
		const result = createFailureApp()

		const configs = listResources(result.app, 'aws_lambda_function_event_invoke_config')
		const echo = configs.find(meta => meta.urn.includes('function:{echo}'))!
		const onErrorLog = configs.find(meta => meta.urn.includes('on-error-log:{main}'))!
		const alias = listResources(result.app, 'aws_lambda_alias').find(meta => meta.urn.includes('function:{echo}'))!

		expect(findInputDeps(echo.input.qualifier)).toContain(alias)
		expect(onErrorLog.input.qualifier).toBeUndefined()
	})

	it('lets every app log group deliver to the error log handler, including the ecs ones', () => {
		const result = createFailureApp({
			jobs: { export: { code } },
			instances: { worker: { code } },
		})

		result.ready()

		const permission = listResources(result.app, 'aws_lambda_permission').find(
			meta => meta.input.principal === 'logs.amazonaws.com'
		)!
		const pattern = new RegExp(
			`^${String(permission.input.sourceArn)
				.replace(/[.+?^${}()|[\]\\]/g, '\\$&')
				.replace(/\*/g, '.*')}$`
		)
		const subscribed = listResources(result.app, 'aws_cloudwatch_log_subscription_filter').map(meta => {
			return findInputDeps(meta.input.logGroupName).find(dep => dep.type === 'aws_cloudwatch_log_group')!
		})
		const names = subscribed.map(meta => meta.input.name)

		expect(names).toEqual(
			expect.arrayContaining([
				'/aws/ecs/test-app--stack-1--job--export',
				'/aws/ecs/test-app--stack-1--instance--worker',
				'/aws/lambda/test-app--stack-1--function--echo',
				'/aws/lambda/test-app--function--bundle',
			])
		)

		for (const name of names) {
			expect(`arn:aws:logs:us-east-1:123456789012:log-group:${name}`).toMatch(pattern)
		}
	})

	it('never loops between the two handlers', () => {
		const result = createFailureApp()

		result.ready()

		const metas = listResources(result.app)
		const lambdas = metas.filter(meta => meta.type === 'aws_lambda_function')
		const onFailure = lambdas.find(meta => meta.input.functionName === 'test-app--on-failure--handler')!
		const onErrorLog = lambdas.find(meta => meta.input.functionName === 'test-app--on-error-log--handler')!
		const full = failureGraph(metas)

		// The on-failure handler reports nowhere: a failing consumer only
		// retries through the queue redrive, which ends in the deadletter
		// that nothing consumes.
		const onFailureQueue = metas.find(meta => meta.input.name === 'test-app--on-failure--failure')!
		const deadletter = metas.find(meta => meta.input.name === 'test-app--on-failure--deadletter')!

		expect([...(full.get(onFailure.urn) ?? [])].map(urn => metas.find(meta => meta.urn === urn)!.type)).toEqual([
			'aws_cloudwatch_log_group',
		])
		expect(full.get(onFailureQueue.urn)).toEqual(new Set([onFailure.urn, deadletter.urn]))
		expect(full.get(deadletter.urn)).toBeUndefined()

		// The error log handler's log group reaches nothing, so its own
		// errors are never consumed again.
		const onErrorLogLogGroup = metas.find(
			meta =>
				meta.type === 'aws_cloudwatch_log_group' &&
				meta.input.name === '/aws/lambda/test-app--on-error-log--handler'
		)!

		expect(full.get(onErrorLogLogGroup.urn)).toBeUndefined()

		// The error log handler's own failures end in the deadletter, which
		// nothing consumes, so nothing ever comes back around.
		expect(full.get(onErrorLog.urn)).toEqual(new Set([onErrorLogLogGroup.urn, deadletter.urn]))
		expect(findCycle(full, onFailure.urn)).toBeUndefined()
		expect(findCycle(full, onErrorLog.urn)).toBeUndefined()
	})
})
