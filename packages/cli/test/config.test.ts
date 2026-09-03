import { describe, expect, it } from 'vitest'
import { createTestApp, findStatements } from './_kit'

describe('config', () => {
	it('registers the app configs & grants the parameter prefix', () => {
		const { configs, shared } = createTestApp({ app: { configs: ['admin-secret', 'max-tasks'] } })

		expect([...configs]).toEqual(['admin-secret', 'max-tasks'])

		const [statement] = findStatements(shared, 'ssm:GetParameter')

		expect(statement).toBeDefined()
		expect(statement!.resources).toEqual(['arn:aws:ssm:us-east-1:123456789012:parameter/.awsless/test-app/*'])
	})

	it('rejects an invalid config name', () => {
		expect(() => createTestApp({ app: { configs: ['Admin Secret'] } })).toThrow()
	})
})
