import { describe, expect, it } from 'vitest'
import { assertStackFilters } from '../src/util/stack-filter'

describe('stack filters', () => {
	const stacks = [{ name: 'todo' }, { name: 'billing' }, { name: 'site-app' }]

	it('should take the stacks that exist, by name or wildcard, and the base stack', () => {
		expect(() => assertStackFilters(stacks)).not.toThrow()
		expect(() => assertStackFilters(stacks, [])).not.toThrow()
		expect(() => assertStackFilters(stacks, ['todo', 'site-*', 'base'])).not.toThrow()
	})

	it('should refuse a filter no stack matches, naming it and the stacks there are', () => {
		expect(() => assertStackFilters(stacks, ['todo', 'tood', 'shop-*'])).toThrow(
			'No stack matches "tood", "shop-*". The stacks are: todo, billing, site-app, base'
		)
	})
})
