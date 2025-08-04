import { ExpressionAttributes } from '../../src/expression/attributes'
import { buildConditionExpression } from '../../src/expression/condition'
import { createFluent, Fluent } from '../../src/expression/fluent'

describe('Condition Expression', () => {
	const assert = (expectation: string, condition: Fluent | Fluent[]) => {
		it(expectation, async () => {
			const attrs = new ExpressionAttributes({ walk: () => ({ marshall: v => v }) })
			const result = buildConditionExpression(attrs, () => condition)

			expect(result).toBe(expectation)
		})
	}

	const e = createFluent()

	describe('comparator', () => {
		assert('#n1 = :v1', e.id.eq(1))
		assert('#n1 <> :v1', e.id.nq(1))
		assert('#n1 < :v1', e.id.lt(1))
		assert('#n1 <= :v1', e.id.lte(1))
		assert('#n1 > :v1', e.id.gt(1))
		assert('#n1 >= :v1', e.id.gte(1))

		assert('#n1 = #n1', e.id.eq(e.id))
		assert('#n1 = #n2', e.id.eq(e.name))
		assert('#n1 = #n2', e.id.eq(e.name))
	})

	describe('special comparator', () => {
		assert('#n1 IN (:v1, :v2, :v3)', e.id.in([1, 2, 3]))
		assert('#n1 BETWEEN :v1 AND :v2', e.id.between(1, 2))
	})

	describe('functions', () => {
		assert('attribute_exists(#n1)', e.id.exists())
		assert('attribute_not_exists(#n1)', e.id.notExists())
		assert('begins_with(#n1, :v1)', e.id.startsWith('prefix'))
		assert('contains(#n1, :v1)', e.id.contains(new Set([1, 2, 3])))
		assert('attribute_type(#n1, :v1)', e.id.type('S'))

		assert('size(#n1) = :v1', e.size(e.id).eq(1))
		assert('size(#n1) = #n1', e.size(e.id).eq(e.id))
		assert('size(#n1) BETWEEN :v1 AND :v2', e.size(e.id).between(1, 2))
		assert('size(#n1) IN (:v1, :v2)', e.size(e.id).in([1, 2]))
	})

	describe('logical evaluations', () => {
		assert('(#n1 = :v1 AND #n1 > :v2)', [e.id.eq(1), e.id.gt(2)])
		assert('(#n1 = :v1 AND #n1 > :v2)', e.and([e.id.eq(1), e.id.gt(2)]))
		assert('(#n1 = :v1 AND #n1 > :v2 AND #n1 >= :v3)', e.and([e.id.eq(1), e.id.gt(2), e.id.gte(3)]))

		assert('(#n1 = :v1 OR #n1 < :v2)', e.or([e.id.eq(1), e.id.lt(2)]))
		assert('(#n1 = :v1 OR #n1 < :v2 OR #n1 <= :v3)', e.or([e.id.eq(1), e.id.lt(2), e.id.lte(3)]))

		assert('((#n1 = :v1 AND #n1 > :v2) AND (#n1 = :v1 OR #n1 > :v2))', [
			e.and([e.id.eq(1), e.id.gt(2)]),
			e.or([e.id.eq(1), e.id.gt(2)]),
		])

		assert('NOT #n1 = :v1', e.not(e.id.eq(1)))
		assert('NOT (#n1 = :v1 AND #n1 > :v1)', e.not([e.id.eq(1), e.id.gt(1)]))
	})

	describe('deep / complex path', () => {
		assert('#n1.#n2 = :v1', e.list.id.eq(1))
		assert('#n1[0] = :v1', e.list(0).eq(1))
		assert('#n1[0].#n2 = :v1', e.list(0).id.eq(1))
		assert('#n1[0].#n2 = :v1', e('list', 0, 'id').eq(1))
		assert('#n1.#n2.#n3 = :v1', e.list[0].id.eq(1))
	})

	it('should throw for unknown operations', () => {
		const attrs = new ExpressionAttributes({ walk: () => ({ marshall: v => v }) })
		expect(() => buildConditionExpression(attrs, e.id.unknown())).toThrow(TypeError)
	})
})
