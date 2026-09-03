import { describe, expect, it } from 'vitest'
import { createTestApp, findStatements } from './_kit'

describe('email', () => {
	it('grants sending through the account identities & app configuration set only', () => {
		const { shared } = createTestApp()

		const statements = findStatements(shared, 'ses:SendEmail')

		expect(statements).toHaveLength(1)
		expect(statements[0]!.actions).toEqual(['ses:SendEmail', 'ses:SendRawEmail'])
		expect(statements[0]!.resources).toEqual([
			'arn:aws:ses:us-east-1:123456789012:identity/*',
			'arn:aws:ses:us-east-1:123456789012:configuration-set/test-app',
		])
	})

	it('keeps a single grant with a domain configured', () => {
		const { shared } = createTestApp({ app: { domains: { main: { domain: 'example.com' } } } })

		expect(findStatements(shared, 'ses:SendEmail')).toHaveLength(1)
	})
})
