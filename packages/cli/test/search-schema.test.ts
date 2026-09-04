import { formatSearchIndexName } from 'awsless'
import { describe, expect, it } from 'vitest'
import { resolveSearchMappings } from '../src/feature/search/util.js'

describe('search schema shorthand', () => {
	it('compiles plain types', () => {
		expect(resolveSearchMappings({ schema: { name: 'keyword', balance: 'double' } })).toStrictEqual({
			properties: {
				name: { type: 'keyword' },
				balance: { type: 'double' },
			},
		})
	})

	it('gives text fields a keyword sub field', () => {
		expect(resolveSearchMappings({ schema: { bio: 'text' } })).toStrictEqual({
			properties: {
				bio: { type: 'text', fields: { keyword: { type: 'keyword' } } },
			},
		})
	})

	it('compiles objects & nested arrays', () => {
		expect(
			resolveSearchMappings({
				schema: {
					player: { id: 'keyword', country: 'keyword' },
					entries: [{ currency: 'keyword', amount: 'double' }],
				},
			})
		).toStrictEqual({
			properties: {
				player: {
					properties: {
						id: { type: 'keyword' },
						country: { type: 'keyword' },
					},
				},
				entries: {
					type: 'nested',
					properties: {
						currency: { type: 'keyword' },
						amount: { type: 'double' },
					},
				},
			},
		})
	})

	it('passes raw $type fields through', () => {
		expect(
			resolveSearchMappings({
				schema: {
					at: { $type: 'date', format: 'epoch_millis' },
					// a sub object with a field named "type" stays an object
					payload: { type: 'keyword' },
				},
			})
		).toStrictEqual({
			properties: {
				at: { type: 'date', format: 'epoch_millis' },
				payload: { properties: { type: { type: 'keyword' } } },
			},
		})
	})

	it('marks strict schemas', () => {
		expect(resolveSearchMappings({ schema: { name: 'keyword' }, strict: true })).toStrictEqual({
			dynamic: 'strict',
			properties: { name: { type: 'keyword' } },
		})
	})

	it('keeps raw mappings untouched', () => {
		const mappings = { properties: { name: { type: 'keyword' } }, dynamic: false }

		expect(resolveSearchMappings({ mappings })).toBe(mappings)
		expect(resolveSearchMappings({})).toBeUndefined()
	})

	it('prefixes the physical index name with the stack', () => {
		expect(formatSearchIndexName('core', 'players')).toBe('core--players')
		expect(formatSearchIndexName('MyStack', 'game-events')).toBe('my-stack--game-events')
	})
})
