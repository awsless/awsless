
import { scan, transactWrite, transactPut, transactConditionCheck, define, mockDynamoDB, object, number, string, optional } from '../src/index'
import { TransactionCanceledException } from '@aws-sdk/client-dynamodb'
import { tables } from './aws/tables'

describe('DynamoDB Transact', () => {

	mockDynamoDB({ tables })

	const posts = define('posts', {
		hash: 'userId',
		sort: 'id',
		schema: object({
			id: number(),
			userId: number(),
			title: optional(string()),
		}),
	})

	it('should transact', async () => {
		await transactWrite({
			items: [
				transactConditionCheck(posts, { userId: 1, id: 0 }, {
					condition(exp) {
						exp.where('id').attributeNotExists
					}
				}),

				transactPut(posts, { userId: 1, id: 1 }),
				transactPut(posts, { userId: 1, id: 2 }),
				transactPut(posts, { userId: 1, id: 3 }),
			]
		})

		const result = await scan(posts)
		expect(result).toStrictEqual({
			cursor: undefined,
			count: 3,
			items: [
				{ userId: 1, id: 1 },
				{ userId: 1, id: 2 },
				{ userId: 1, id: 3 }
			]}
		)
	})

	it('should throw on condition error', async () => {
		const promise = transactWrite({
			items: [
				transactConditionCheck(posts, { userId: 1, id: 1 }, {
					condition(exp) {
						exp.where('id').attributeNotExists
					}
				}),
				transactPut(posts, { userId: 1, id: 4 }),
			]
		})

		await expect(promise).rejects.toThrow(TransactionCanceledException)

		const result = await scan(posts)
		expect(result).toStrictEqual({
			cursor: undefined,
			count: 3,
			items: [
				{ userId: 1, id: 1 },
				{ userId: 1, id: 2 },
				{ userId: 1, id: 3 }
			]}
		)
	})
})
