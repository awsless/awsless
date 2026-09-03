import { describe, expect, it } from 'vitest'
import { createTestApp, listResources } from './_kit'

const code = { file: { nocheck: './cleanup.ts' } }

describe('cron', () => {
	it('schedules the bundle route through the shared schedule group', () => {
		const { app } = createTestApp({
			stacks: [{ name: 'stack-1', crons: { cleanup: { schedule: '1 day', consumer: { code } } } }],
		})

		const schedules = listResources(app, 'aws_scheduler_schedule')

		expect(listResources(app, 'aws_scheduler_schedule_group').filter(meta => meta.input.name.includes('--cron--'))).toHaveLength(1)
		expect(schedules).toHaveLength(1)
		expect(schedules[0]!.input.scheduleExpression).toBe('rate(1 day)')
		expect(schedules[0]!.input.state).toBe('ENABLED')
	})

	it('keeps a disabled cron around but off', () => {
		const { app } = createTestApp({
			stacks: [{ name: 'stack-1', crons: { cleanup: { schedule: '1 day', consumer: { code }, enabled: false } } }],
		})

		expect(listResources(app, 'aws_scheduler_schedule')[0]!.input.state).toBe('DISABLED')
	})

	it('creates no schedule group without crons', () => {
		const { app } = createTestApp({ stacks: [{ name: 'stack-1' }] })

		expect(listResources(app, 'aws_scheduler_schedule_group').filter(meta => meta.input.name.includes('--cron--'))).toHaveLength(0)
	})
})
