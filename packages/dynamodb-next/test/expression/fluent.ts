import { createFluent, Fluent, getFluentExpression, getFluentPath } from '../../src/expression/fluent'

describe('Fluent Expression', () => {
	const e = createFluent()

	const assertPath = (prop: Fluent, path: Array<string | number>) => {
		expect(getFluentPath(prop)).toStrictEqual(path)
	}

	const assertExpression = (prop: Fluent, result: unknown) => {
		expect(getFluentExpression(prop)).toStrictEqual(result)
	}

	it('static paths', () => {
		expect(e.id).toBeTypeOf('function')
		expect(e.id instanceof Fluent).toBeTruthy()

		assertPath(e.id, ['id'])
		assertPath(e.deep.id, ['deep', 'id'])
		assertPath(e.deep[1].id, ['deep', '1', 'id'])
		assertPath(e.deep(1).id, ['deep', 1, 'id'])
		assertPath(e.deep.at(1).id, ['deep', 1, 'id'])
	})

	it('dynamic paths', () => {
		expect(e('id')).toBeTypeOf('function')
		expect(e('id') instanceof Fluent).toBeTruthy()

		assertPath(e('id'), ['id'])
		assertPath(e('deep', 'id'), ['deep', 'id'])
		assertPath(e('deep', 1, 'id'), ['deep', 1, 'id'])
	})

	it('functions', () => {
		assertExpression(e.set(1), {
			op: 'set',
			path: [],
			value: [1],
		})

		assertExpression(e.id.eq(2), {
			op: 'eq',
			path: ['id'],
			value: [2],
		})

		assertExpression(e.deep.id.gt(3), {
			op: 'gt',
			path: ['deep', 'id'],
			value: [3],
		})

		assertExpression(e.record.at(1).lt(4), {
			op: 'lt',
			path: ['record', 1],
			value: [4],
		})

		assertExpression(
			e.and([
				//
				e.userId.eq(1),
				e.profile.age.eq(e.userId),
			]),
			{
				op: 'and',
				path: [],
				value: [
					[
						//
						expect.any(Fluent),
						expect.any(Fluent),
					],
				],
			}
		)
	})
})
