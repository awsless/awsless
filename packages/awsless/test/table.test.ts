import { number, object, string } from '@awsless/dynamodb'
import { assertKeyAttributes, Table } from '../src/lib/server/table'

describe('table', () => {
	const schema = object({ id: string(), createdAt: number(), name: string() })

	it('accepts a schema that defines every key attribute', () => {
		expect(() =>
			assertKeyAttributes(
				'stack.items',
				{ hash: 'id', sort: 'createdAt', indexes: { byName: { hash: 'name' } } },
				schema
			)
		).not.toThrow()
	})

	it('rejects a schema missing a key attribute', () => {
		expect(() => assertKeyAttributes('stack.items', { hash: 'id', sort: 'updatedAt' }, schema)).toThrow(
			'missing the "updatedAt" key field'
		)
		expect(() =>
			assertKeyAttributes('stack.items', { hash: 'id', indexes: { byOwner: { hash: 'ownerId' } } }, schema)
		).toThrow('missing the "ownerId" key field')
	})

	it('verifies the schema against the stack file keys when defining', () => {
		vi.stubEnv('APP', 'app')
		vi.stubEnv('TABLE_STACK_ITEMS_KEYS', JSON.stringify({ hash: 'id', sort: 'missing' }))

		try {
			expect(() => (Table as any).stack.items.define(schema)).toThrow('missing the "missing" key field')
			expect(() => (Table as any).stack.other.define(schema)).toThrow('No table key config found')
		} finally {
			vi.unstubAllEnvs()
		}
	})
})
