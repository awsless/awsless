import { ExpressionAttributes } from '../../src/expression/attributes'
import { users } from '../aws/tables'

describe('Condition Expression', () => {
	it('should generate value ids correctly', () => {
		const exp = new ExpressionAttributes(users)

		const results = [
			//
			exp.value('value', ['name']),
			exp.value(1, ['id']),
			exp.value('value', ['name']),
		]

		expect(results).toStrictEqual([
			//
			':v1',
			':v2',
			':v1',
		])

		expect(exp.attributes()).toStrictEqual({
			ExpressionAttributeValues: {
				':v1': {
					S: 'value',
				},
				':v2': {
					N: '1',
				},
			},
		})
	})

	it('should generate raw ids correctly', () => {
		const exp = new ExpressionAttributes(users)

		const results = [
			//
			exp.raw({ S: 'value' }),
			exp.raw({ N: '1' }),
			exp.raw({ S: 'value' }),
		]

		expect(results).toStrictEqual([
			//
			':v1',
			':v2',
			':v1',
		])

		expect(exp.attributes()).toStrictEqual({
			ExpressionAttributeValues: {
				':v1': {
					S: 'value',
				},
				':v2': {
					N: '1',
				},
			},
		})
	})

	it('should generate name ids correctly', () => {
		const exp = new ExpressionAttributes(users)

		const results = [
			//
			exp.name('name-1'),
			exp.name('name-2'),
			exp.name('name-1'),
		]

		expect(results).toStrictEqual([
			//
			'#n1',
			'#n2',
			'#n1',
		])

		expect(exp.attributes()).toStrictEqual({
			ExpressionAttributeNames: {
				'#n1': 'name-1',
				'#n2': 'name-2',
			},
		})
	})

	it('should generate path ids correctly', () => {
		const exp = new ExpressionAttributes(users)

		const results = [
			//
			exp.path(['id']),
			exp.path(['path']),
			exp.path(['path', 'id']),
			exp.path(['path', 1, 'id']),
		]

		expect(results).toStrictEqual([
			//
			'#n1',
			'#n2',
			'#n2.#n1',
			'#n2[1].#n1',
		])

		expect(exp.attributes()).toStrictEqual({
			ExpressionAttributeNames: {
				'#n1': 'id',
				'#n2': 'path',
			},
		})
	})
})
