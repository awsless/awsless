import { describe, expect, it } from 'vitest'
import { StackSchema } from '../src/config/stack'
import { validateFeatures } from '../src/feature/validate'
import { createTestApp, findStatements, listResources } from './_kit'

const code = { file: { nocheck: './subscriber.ts' } }

describe('topic', () => {
	it('creates a topic per app topic', () => {
		const { app, shared } = createTestApp({
			app: { topics: ['order-created'] },
		})

		const topics = listResources(app, 'aws_sns_topic')

		expect(topics.map(meta => meta.input.name)).toContain('test-app--topic--order-created')
		expect(listResources(app, 'aws_sns_topic_subscription')).toHaveLength(0)
		expect(
			findStatements(shared, 'sns:Publish').some(statement =>
				JSON.stringify(statement.resources).includes('--topic--')
			)
		).toBe(true)
	})

	it('subscribes the bundle once per topic with a subscriber', () => {
		const { app } = createTestApp({
			app: { topics: ['order-created'] },
			stacks: [
				{ name: 'stack-1', subscribers: { 'order-created': { consumer: { code } } } },
				{ name: 'stack-2', subscribers: { 'order-created': { consumer: { code } } } },
			],
		})

		const subscriptions = listResources(app, 'aws_sns_topic_subscription')

		expect(subscriptions).toHaveLength(1)
		expect(subscriptions[0]!.input.protocol).toBe('lambda')
		expect(listResources(app, 'aws_lambda_permission').some(meta => meta.input.principal === 'sns.amazonaws.com')).toBe(
			true
		)
	})

	it('rejects a subscriber for an unknown topic', () => {
		const { appConfig } = createTestApp({ app: { topics: ['order-created'] } })
		const stack = { ...StackSchema.parse({ name: 'stack-1', subscribers: { unknown: { consumer: { code } } } }), file: 'x' }

		expect(() => validateFeatures({ appConfig, stackConfigs: [stack] })).toThrow()
	})
})
