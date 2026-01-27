import { ExpressionAttributes } from '../../src/expression/attributes'
import { buildProjectionExpression } from '../../src/expression/projection'

describe('Projection Expression', () => {
	const mockTable = { walk: () => ({ marshall: (v: any) => v }) } as any

	const assert = (expectation: string, projection: string[]) => {
		it(expectation, async () => {
			const attrs = new ExpressionAttributes(mockTable)
			const result = buildProjectionExpression(attrs, projection)

			expect(result).toBe(expectation)
		})
	}

	assert('#n1', ['id'])
	assert('#n1, #n2', ['id', 'name'])
	// assert('#n1.#n2', { deep: { id: true } })
	// assert('#n1[0]', { array: { 0: true } })
	// assert('#n1[0].#n2', { array: { 0: { id: true } } })
})
