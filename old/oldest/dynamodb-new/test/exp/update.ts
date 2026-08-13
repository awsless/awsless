import { define, number, object, string, unknown } from '../../src'
import { UpdateExpression, updateExpression } from '../../src/expressions/update'
import { IDGenerator } from '../../src/helper/id-generator'

describe('Update Expression', () => {
	const users = define('users', {
		hash: 'id',
		schema: object({
			id: number(),
			name: string(),
			other: string(),
			json: unknown(),
		}),
	})

	const assert = (
		expectation: string,
		update: (exp: UpdateExpression<typeof users>) => UpdateExpression<typeof users>
	) => {
		it(expectation, async () => {
			const gen = new IDGenerator(users)
			const result = updateExpression({ update }, gen)

			expect(result).toBe(expectation)
		})
	}

	assert('SET #n1 = :v1', exp => exp.update('id').set(1))

	assert('SET #n1 = :v1, #n2 = :v2', exp => exp.update('id').set(1).update('name').set('hello'))

	assert('SET #n1 = if_not_exists( #n1 , :v1 )', exp => exp.update('id').setIfNotExists(1))

	assert('REMOVE #n1', exp => exp.update('id').del())

	assert('SET #n1 = if_not_exists( #n1 , :v1 ) + :v2', exp => exp.update('id').incr())

	assert('SET #n1 = if_not_exists( #n1 , :v1 ) - :v2', exp => exp.update('id').decr())

	assert('ADD #n1 :v1', exp => exp.update('id').append(1))

	assert('DELETE #n1 :v1', exp => exp.update('id').remove(1))

	assert('REMOVE #n1', exp => exp.update('json').set(undefined))

	assert('SET #n1 = :v1, #n2 = :v2', exp => exp.setItem({ id: 1, name: 'hello' }))

	assert(
		[
			'SET ' +
				[
					'#n1 = :v1',
					'#n1 = if_not_exists( #n1 , :v2 )',
					'#n2 = :v3',
					'#n1 = if_not_exists( #n1 , :v4 ) + :v5',
					'#n1 = if_not_exists( #n1 , :v6 ) - :v7',
				].join(', '),
			'ADD #n1 :v8, #n2 :v9',
			'REMOVE #n1, #n2',
			'DELETE #n2 :v10',
		].join(' '),
		exp =>
			exp
				.update('id')
				.set(1)
				.update('id')
				.setIfNotExists(1)
				.update('name')
				.set('John')
				.update('id')
				.del()
				.update('name')
				.del()
				.update('id')
				.incr()
				.update('id')
				.decr()
				.update('id')
				.append(1)
				.update('name')
				.append('Jack')
				.update('name')
				.remove('Jack')
	)

	assert('SET #n1 = :v1, #n2 = :v2', exp =>
		exp
			.extend(exp => (true ? exp.update('id').set(1) : exp))
			.update('name')
			.set('Jack')
	)

	assert('SET #n1 = #n2', exp => exp.update('name').setAttr('other'))
})
