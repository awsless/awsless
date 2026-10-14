import { describe, expect, it } from 'vitest'
import { createTestApp, listResources } from './_kit'

const code = { file: { nocheck: './on-export.ts' } }

describe('store', () => {
	it('creates a bucket per store', () => {
		const result = createTestApp({
			stacks: [
				{ name: 'stack-1', stores: ['exports'] },
				{ name: 'stack-2', stores: ['uploads'] },
			],
		})

		result.ready()

		const buckets = listResources(result.app, 'aws_s3_bucket').map(meta => meta.input.bucket)

		expect(buckets).toContainEqual(expect.stringMatching(/^test-app--stack-1--store--exports--/))
		expect(buckets).toContainEqual(expect.stringMatching(/^test-app--stack-2--store--uploads--/))
	})

	it('notifies the bundle from a notification per store bucket', () => {
		const result = createTestApp({
			stacks: [
				{
					name: 'stack-1',
					stores: {
						exports: {
							events: {
								'created:*': { consumer: { code } },
								'removed:delete': { consumer: { code } },
							},
						},
					},
				},
				{ name: 'stack-2', stores: { uploads: { events: { 'removed:delete': { consumer: { code } } } } } },
			],
		})

		result.ready()

		const notifications = listResources(result.app, 'aws_s3_bucket_notification')

		expect(notifications).toHaveLength(2)

		const rules = notifications.flatMap(meta => meta.input.lambdaFunction)

		expect(rules).toHaveLength(3)
		expect(rules[0]).toMatchObject({ events: ['s3:ObjectCreated:*'] })
		expect(rules[0].id).toMatch(/^stack-1:store:exports-/)
		expect(rules[0].filterPrefix).toBeUndefined()

		const permissions = listResources(result.app, 'aws_lambda_permission').filter(
			meta => meta.input.principal === 's3.amazonaws.com'
		)

		expect(permissions).toHaveLength(2)
	})

	it('creates no notification for stores without events', () => {
		const result = createTestApp({
			stacks: [{ name: 'stack-1', stores: ['exports'] }],
		})

		result.ready()

		expect(listResources(result.app, 'aws_s3_bucket_notification')).toHaveLength(0)
	})
})
