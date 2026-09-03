import { describe, expect, it } from 'vitest'
import { getFeatureFolder } from '../src/feature/asset/index'
import { createTestApp, listResources } from './_kit'

const code = { file: { nocheck: './on-export.ts' } }

describe('store events', () => {
	it('notifies the bundle from one shared bucket notification', () => {
		const result = createTestApp({
			stacks: [
				{ name: 'stack-1', stores: { exports: { events: { 'created:*': { consumer: { code } } } } } },
				{ name: 'stack-2', stores: { uploads: { events: { 'removed:delete': { consumer: { code } } } } } },
			],
		})

		result.ready()

		const notifications = listResources(result.app, 'aws_s3_bucket_notification')
		const rules = notifications[0]!.input.lambdaFunction

		expect(notifications).toHaveLength(1)
		expect(rules).toHaveLength(2)
		expect(rules[0]).toMatchObject({
			events: ['s3:ObjectCreated:*'],
			filterPrefix: getFeatureFolder('store', 'stack-1', 'exports'),
		})
		expect(rules[0].id).toMatch(/^stack-1:store:exports-/)
		expect(rules[1]).toMatchObject({
			events: ['s3:ObjectRemoved:Delete'],
			filterPrefix: getFeatureFolder('store', 'stack-2', 'uploads'),
		})

		const permission = listResources(result.app, 'aws_lambda_permission').find(
			meta => meta.input.principal === 's3.amazonaws.com'
		)

		expect(permission).toBeDefined()
	})

	it('creates no notification for stores without events', () => {
		const result = createTestApp({
			stacks: [{ name: 'stack-1', stores: ['exports'] }],
		})

		result.ready()

		expect(listResources(result.app, 'aws_s3_bucket_notification')).toHaveLength(0)
	})
})
