
import { define, number, object, string, stringSet } from '../../src'
import { Combine, Condition, conditionExpression } from '../../src/expressions/condition'
import { IDGenerator } from '../../src/helper/id-generator'

describe('Condition Expression', () => {

	const users = define('users', {
		hash: 'id',
		schema: object({
			id: number(),
			name: string(),
			tags: stringSet(),
		}),
	})

	const assert = (
		expectation:string,
		condition:(exp:Condition<typeof users>) => Combine<typeof users>,
	) => {
		it(expectation, async () => {
			const gen = new IDGenerator(users)
			const result = conditionExpression({ condition }, gen)

			expect(result).toBe(expectation)
		})
	}

	assert(
		'attribute_exists( #n1 ) OR NOT ( attribute_exists( #n1 ) )',
		(exp) => exp
			.where('id').exists
			.or
			.where('id').not.exists
	)

	assert(
		'( #n1 = :v1 ) AND ( #n1 <> :v2 ) AND ( #n1 > :v3 ) AND ( #n1 >= :v4 ) AND ( #n1 < :v5 ) AND ( #n1 <= :v6 )',
		(exp) => exp
			.where('id').eq(1)
			.and
			.where('id').nq(1)
			.and
			.where('id').gt(1)
			.and
			.where('id').gte(1)
			.and
			.where('id').lt(1)
			.and
			.where('id').lte(0)
	)

	assert(
		'( ( #n1 = :v1 ) AND ( #n1 = :v2 ) ) OR ( #n1 = :v3 )',
		(exp) => exp
			.group(exp => exp
				.where('id').eq(1)
				.and
				.where('id').eq(2)
			)
			.or
			.where('id').eq(3)
	)

	assert(
		'( #n1 = :v1 ) OR ( #n1 = :v2 )',
		(exp) => exp
			.extend(exp => {
				exp.where('id').eq(1)
				const b = exp.where('id').eq(2)

				return b
			})
			.or
			.where('id').eq(3)
	)

	assert(
		'( #n1 BETWEEN :v1 AND :v2 )',
		(exp) => exp.where('id').between(1, 100)
	)

	assert(
		'( size( #n1 ) > :v1 )',
		(exp) => exp.where('id').size.gt(1)
	)

	assert(
		'( #n1 IN ( :v1 , :v2 , :v3 ))',
		(exp) => exp.where('id').in([1, 2, 3])
	)

	assert(
		'attribute_type( #n1 , :v1 )',
		(exp) => exp.where('id').attributeType('N')
	)

	assert(
		'begins_with( #n1 , :v1 )',
		(exp) => exp.where('name').beginsWith('start-')
	)

	assert(
		'contains( #n1 , :v1 )',
		(exp) => exp.where('tags').contains('tag')
	)

	assert(
		'attribute_exists( #n1 ) OR NOT ( attribute_exists( #n1 ) )',
		(exp) => exp
			.extend(exp => true ? exp.where('id').exists.or : exp)
			.where('id').not.exists
	)
})
