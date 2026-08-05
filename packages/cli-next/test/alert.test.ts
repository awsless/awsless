import { describe, expect, it } from 'vitest'
import { AlertsDefaultSchema } from '../src/feature/alert/schema'

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

	it('should reject phone numbers that are not in E.164 format', () => {
		expect(() => AlertsDefaultSchema.parse({ ops: ['0612345678'] })).toThrow()
		expect(() => AlertsDefaultSchema.parse({ ops: ['not-an-endpoint'] })).toThrow()
	})
})
