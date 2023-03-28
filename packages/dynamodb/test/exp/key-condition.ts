
import { define, number, object, string } from '../../src'
import { Combine, KeyCondition, keyConditionExpression } from '../../src/expressions/key-condition'
import { IDGenerator } from '../../src/helper/id-generator'

describe('Key Condition Expression', () => {

	const users = define('users', {
		hash: 'id',
		sort: 'name',
		schema: object({
			id: number(),
			name: string(),
		}),
	})

	const assert = (
		expectation:string,
		keyCondition:(exp:KeyCondition<typeof users, undefined>) => Combine<typeof users, undefined>,
	) => {
		it(expectation, async () => {
			const gen = new IDGenerator(users)
			const result = keyConditionExpression({ keyCondition }, gen)

			expect(result).toBe(expectation)
		})
	}

	assert(
		'( #n1 = :v1 ) AND ( #n1 > :v1 ) AND ( #n1 >= :v1 ) AND ( #n1 < :v1 ) AND ( #n1 <= :v1 )',
		(exp) => exp
			.where('id').eq(1)
			.and
			.where('id').gt(1)
			.and
			.where('id').gte(1)
			.and
			.where('id').lt(1)
			.and
			.where('id').lte(1)
	)

	assert(
		'( #n1 BETWEEN :v1 AND :v2 )',
		(exp) => exp.where('id').between(1, 100)
	)

	assert(
		'begins_with( #n1 , :v1 )',
		(exp) => exp.where('name').beginsWith('start-')
	)

	assert(
		'( #n1 = :v1 ) AND ( #n1 > :v1 )',
		(exp) => exp
			.extend(exp => true ? exp.where('id').eq(1).and : exp)
			.where('id').gt(1)
	)
})
