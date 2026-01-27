import { ExpressionAttributes } from '../../src/expression/attributes'
import { createFluent } from '../../src/expression/fluent'
import { buildUpdateExpression } from '../../src/expression/update'

describe('Update Expression', () => {
	const e = createFluent()

	const mockTable = { walk: () => ({ marshall: (v: any) => v }) } as any

	const assert = (expectation: string, update: any) => {
		it(expectation, async () => {
			const attrs = new ExpressionAttributes(mockTable)
			const result = buildUpdateExpression(attrs, () => update)
			expect(result).toBe(expectation)
		})
	}

	describe('set', () => {
		assert('SET #n1 = :v1', e.id.set(1))
		assert('SET #n1 = #n2', e.id.set(e.name))
		assert('SET #n1 = :v1, #n2 = :v2', [e.id.set(1), e.name.set(2)])
		assert('SET #n1.#n2 = :v1, #n1.#n3 = :v2', [e.deep.id.set(1), e.deep.name.set(2)])
		assert('SET #n1[0] = :v1', e.items(0).set(1))
	})

	it('should throw when you try to set the root object', () => {
		expect(() => {
			const update = e.set({ id: 1, name: 1 })
			const attrs = new ExpressionAttributes(mockTable)
			buildUpdateExpression(attrs, () => update)
		}).toThrow(TypeError)
	})

	describe('set partial on root', () => {
		assert(
			'SET #n1 = :v1, #n2 = :v1',
			e.setPartial({
				id: 1,
				name: 1,
			})
		)
	})

	describe('setIfNotExists', () => {
		assert('SET #n1 = if_not_exists(#n1, :v1)', e.id.setIfNotExists(1))
	})

	// describe('setPartial', () => {
	// 	assert('SET #n1 = :v1, #n2 = :v2', { $setPartial: { id: 1, name: 2 } })
	// 	assert('SET #n1.#n2 = :v1, #n1.#n3 = :v2', { deep: { $setPartial: { id: 1, name: 2 } } })
	// })

	describe('incr', () => {
		assert('SET #n1 = if_not_exists(#n1, :v1) + :v2', e.id.incr(1))
		assert('SET #n1 = if_not_exists(#n1, :v1) + :v2', e.id.incr(1, 100))
	})

	describe('desc', () => {
		assert('SET #n1 = if_not_exists(#n1, :v1) - :v2', e.id.decr(1))
		assert('SET #n1 = if_not_exists(#n1, :v1) - :v2', e.id.decr(1, 100))
	})

	describe('delete', () => {
		assert('REMOVE #n1', e.id.delete())
		assert('REMOVE #n1', e.id.set())
		assert('REMOVE #n1', e.id.set(null))
		assert('REMOVE #n1', e.id.set(undefined))
		assert('SET #n1 = :v1', e.id.set(new Set()))
	})

	describe('push', () => {
		assert('SET #n1 = list_append(#n1, :v1)', e.id.push(1))
	})

	describe('append', () => {
		assert('ADD #n1.#n2 :v1', e.id.append(1))
	})

	describe('remove', () => {
		assert('DELETE #n1.#n2 :v1', e.id.remove(1))
	})

	describe('combine', () => {
		assert('ADD #n1.#n2 :v1 DELETE #n1.#n2 :v1', [
			//
			e.id.append(1),
			e.id.remove(1),
		])
	})

	it('should throw for unknown operations', () => {
		const attrs = new ExpressionAttributes(mockTable)
		expect(() => buildUpdateExpression(attrs, e.id.unknown())).toThrow(TypeError)
	})
})
