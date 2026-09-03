import { describe, expect, it } from 'vitest'
import { createTestApp, findStatements, listResources } from './_kit'

describe('metric', () => {
	it('grants metric writes on the app namespace only', () => {
		const { app, shared } = createTestApp({
			stacks: [{ name: 'stack-1', metrics: { latency: { type: 'duration' } } }],
		})

		const [statement] = findStatements(shared, 'cloudwatch:PutMetricData')

		expect(statement).toBeDefined()
		expect(statement!.conditions).toMatchObject({ StringEquals: { 'cloudwatch:namespace': expect.any(String) } })
		expect(listResources(app, 'aws_cloudwatch_metric_alarm')).toHaveLength(0)
	})

	it('alarms through an sns topic with email subscribers', () => {
		const { app } = createTestApp({
			stacks: [
				{
					name: 'stack-1',
					metrics: {
						latency: {
							type: 'duration',
							alarms: [{ where: 'avg >= 1000', period: '1 hour', trigger: 'ops@example.com' }],
						},
					},
				},
			],
		})

		const alarm = listResources(app, 'aws_cloudwatch_metric_alarm')[0]!

		expect(alarm.input.comparisonOperator).toBe('GreaterThanOrEqualToThreshold')
		expect(alarm.input.statistic).toBe('Average')
		expect(alarm.input.threshold).toBe(1000)
		expect(listResources(app, 'aws_sns_topic')).toHaveLength(1)
		expect(listResources(app, 'aws_sns_topic_subscription')[0]!.input.endpoint).toBe('ops@example.com')
	})
})
