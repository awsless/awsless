import { getMeta } from '@terraforge/core'
import { describe, expect, it } from 'vitest'
import { createTestApp, findStatements } from './_kit'

const schedulePolicy = (app: ReturnType<typeof createTestApp>['app']) => {
	const role = app.resources
		.map(getMeta)
		.find(meta => meta.type === 'aws_iam_role' && meta.input.name === 'test-app--task--schedule')!

	return JSON.parse((role.input.inlinePolicy as { policy: string }[])[0]!.policy)
}

describe('task schedule role', () => {
	it('invokes the versioned bundle & dead-letters to the on-failure queue when configured', () => {
		const { app } = createTestApp({
			app: { onFailure: { consumer: { code: { file: { nocheck: './on-failure.ts' } } } } },
		})

		expect(schedulePolicy(app).Statement).toStrictEqual([
			{
				Action: ['lambda:InvokeFunction'],
				Effect: 'Allow',
				Resource: 'arn:aws:lambda:us-east-1:123456789012:function:test-app--function--bundle:*',
			},
			{
				Action: ['sqs:SendMessage'],
				Effect: 'Allow',
				Resource: 'arn:aws:sqs:us-east-1:123456789012:test-app--on-failure--failure',
			},
		])
	})

	it('grants no queue send without an on-failure queue', () => {
		const { app } = createTestApp()

		expect(schedulePolicy(app).Statement.map((statement: { Action: string[] }) => statement.Action)).toEqual([
			['lambda:InvokeFunction'],
		])
	})

	it('only passes the schedule role to the scheduler', () => {
		const { shared } = createTestApp()

		const passRole = findStatements(shared, 'iam:PassRole').find(statement =>
			JSON.stringify(statement.conditions).includes('scheduler.amazonaws.com')
		)!
		const create = findStatements(shared, 'scheduler:CreateSchedule')[0]!

		expect(passRole.conditions).toEqual({
			StringEquals: { 'iam:PassedToService': 'scheduler.amazonaws.com' },
		})
		expect(create.resources).toEqual(['arn:aws:scheduler:us-east-1:123456789012:schedule/test-app--task--group/*'])
	})
})
