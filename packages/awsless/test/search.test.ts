import { assertMatchingMappings, formatSearchIndexName } from '../src/lib/server/search'

describe('search', () => {
	it('formats the index name like the cli', () => {
		expect(formatSearchIndexName('MyStack', 'products')).toBe('my-stack--products')
	})

	const declared = {
		properties: {
			name: { type: 'keyword' },
			price: { type: 'long' },
			owner: { properties: { id: { type: 'keyword' } } },
		},
	}

	it('accepts matching & interchangeable mappings', () => {
		const defined = {
			properties: {
				name: { type: 'text' },
				price: { type: 'double' },
				owner: { properties: { id: { type: 'keyword' } } },
			},
		}

		expect(() => assertMatchingMappings('stack.items', declared, defined)).not.toThrow()
	})

	it('rejects fields missing on either side', () => {
		expect(() =>
			assertMatchingMappings('stack.items', declared, {
				properties: { ...declared.properties, extra: { type: 'keyword' } },
			})
		).toThrow('defines the field "extra", which the stack file doesn\'t declare')

		const { price: _, ...rest } = declared.properties
		expect(() => assertMatchingMappings('stack.items', declared, { properties: rest })).toThrow(
			'declares the field "price" for search index "stack.items", which the code schema doesn\'t define'
		)
	})

	it('rejects incompatible types & nested shape mismatches', () => {
		expect(() =>
			assertMatchingMappings('stack.items', declared, {
				properties: { ...declared.properties, price: { type: 'keyword' } },
			})
		).toThrow('is a "keyword" in the code schema but a "long" in the stack file')

		expect(() =>
			assertMatchingMappings('stack.items', declared, {
				properties: { ...declared.properties, owner: { type: 'keyword' } },
			})
		).toThrow('"owner" of search index "stack.items" is an object on one side but not the other')

		expect(() =>
			assertMatchingMappings('stack.items', declared, {
				properties: { ...declared.properties, owner: { properties: { id: { type: 'long' } } } },
			})
		).toThrow('The field "owner.id"')
	})
})
