import { describe, expect, it } from 'vitest'
import { AlertsDefaultSchema } from '../src/feature/alert/schema'
import { createTestApp, listResources } from './_kit'

describe('alert schema', () => {
	it('should accept a single email address', () => {
		expect(AlertsDefaultSchema.parse({ ops: 'ops@team.com' })).toStrictEqual({
			ops: ['ops@team.com'],
		})
	})

	it('should accept a single phone number', () => {
		expect(AlertsDefaultSchema.parse({ ops: '+31612345678' })).toStrictEqual({
			ops: ['+31612345678'],
		})
	})

	it('should accept a mixed array of emails & phone numbers', () => {
		expect(AlertsDefaultSchema.parse({ ops: ['ops@team.com', '+31612345678'] })).toStrictEqual({
			ops: ['ops@team.com', '+31612345678'],
		})
	})

	it('should accept config references', () => {
		expect(AlertsDefaultSchema.parse({ ops: ['ops@team.com', 'config:private-phone'] })).toStrictEqual({
			ops: ['ops@team.com', 'config:private-phone'],
		})
	})

	it('should reject invalid config references', () => {
		expect(() => AlertsDefaultSchema.parse({ ops: ['config:Invalid_Name'] })).toThrow()
	})

	it('should reject phone numbers that are not in E.164 format', () => {
		expect(() => AlertsDefaultSchema.parse({ ops: ['0612345678'] })).toThrow()
		expect(() => AlertsDefaultSchema.parse({ ops: ['not-an-endpoint'] })).toThrow()
	})
})

describe('alarms', () => {
	const stream = { type: 'keys-only', consumer: { code: { file: { nocheck: './stream.ts' } } } }

	it('alarms on the bundle, sent to the alert', () => {
		const { app } = createTestApp({
			app: {
				alerts: { debug: 'ops@team.com' },
				alarms: { alert: 'debug', streamAge: '10 minutes', throttles: 1 },
			},
			stacks: [{ name: 'stack-1', tables: { tasks: { hash: 'id', stream } } }],
		})

		const alarms = listResources(app, 'aws_cloudwatch_metric_alarm')
		const byMetric = (name: string) => alarms.find(alarm => alarm.input.metricName === name)!

		expect(alarms).toHaveLength(2)
		expect(byMetric('IteratorAge').input.threshold).toBe(10 * 60 * 1000)
		expect(byMetric('IteratorAge').input.statistic).toBe('Maximum')
		expect(byMetric('Throttles').input.threshold).toBe(1)
		expect(byMetric('Throttles').input.statistic).toBe('Sum')
		expect(byMetric('Throttles').input.alarmName).toBe('test-app--alarm--throttles')
		expect(byMetric('Throttles').input.alarmActions).toHaveLength(1)
		expect(byMetric('Throttles').input.okActions).toHaveLength(1)
	})

	it('skips the stream age alarm without table streams', () => {
		const { app } = createTestApp({
			app: { alerts: { debug: 'ops@team.com' }, alarms: { alert: 'debug', streamAge: '10 minutes' } },
		})

		expect(listResources(app, 'aws_cloudwatch_metric_alarm')).toHaveLength(0)
	})

	it('refuses an alert that is not defined', () => {
		expect(() =>
			createTestApp({ app: { alerts: { debug: 'ops@team.com' }, alarms: { alert: 'ops', throttles: 1 } } })
		).toThrow(/isn't defined/)
	})
})
