import { getMeta } from '@terraforge/core'
import { describe, expect, it } from 'vitest'
import { createTestApp } from './_kit'

describe('task schedule role', () => {
	it('can invoke versioned bundles and send failures to the DLQ', () => {
		const { app } = createTestApp()
		const role = app.resources
			.map(getMeta)
			.find(meta => meta.type === 'aws_iam_role' && meta.input.name === 'test-app--task--schedule')
		const policy = JSON.parse((role!.input.inlinePolicy as { policy: string }[])[0]!.policy)

		expect(policy.Statement).toStrictEqual([
			{
				Action: ['lambda:InvokeFunction'],
				Effect: 'Allow',
				Resource: 'arn:aws:lambda:*:*:function:test-app--function--bundle:*',
			},
			{
				Action: ['sqs:SendMessage'],
				Effect: 'Allow',
				Resource: 'arn:aws:sqs:*:*:test-app--on-failure--failure',
			},
		])
	})
})
