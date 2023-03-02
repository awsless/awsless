
import { mockDynamoDB, putItem, ConditionalCheckFailedException, transactWrite, transactPut, TransactionCanceledException, define, object, number, string } from '../src/index'
import { tables } from './aws/tables'

describe('Condition Exeption', () => {

	mockDynamoDB({ tables })

	const users = define('users', {
		hash: 'id',
		schema: object({
			id:	number(),
			name: string(),
		})
	})

	const user1 = { id: 1, name: 'John' }
	const user2 = { id: 2, name: 'Gill' }

	it('should fail on condition failure', async () => {
		const promise = putItem(users, user1, {
			condition(exp) { exp.where('id').attributeExists }
		})

		await expect(promise).rejects.toThrow(ConditionalCheckFailedException)
	})

	it('should fail on transaction condition failure', async () => {
		const promise = transactWrite({
			items: [
				transactPut(users, user1),
				transactPut(users, user2, {
					condition(exp) { exp.where('id').attributeExists }
				}),
			]
		})

		await expect(promise).rejects.toThrow(TransactionCanceledException)

		try {
			await promise
		} catch(error) {
			if(error instanceof TransactionCanceledException) {
				expect(error.CancellationReasons).toStrictEqual([
					{
						Code: 'None',
						Item: undefined,
						Message: undefined
					},
					{
						Code: 'ConditionalCheckFailed',
						Item: undefined,
						Message: expect.any(String) as string
					},
				])
			}
		}
	})
})
