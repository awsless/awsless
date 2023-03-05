
import { mockDynamoDB, putItem, ConditionalCheckFailedException, transactWrite, transactPut, TransactionCanceledException } from '../../src/index'
import { users } from '../aws/tables'

describe('Condition Exeption', () => {

	mockDynamoDB({ tables: [ users ] })

	const user1 = { id: 1, name: 'John' }
	const user2 = { id: 2, name: 'Gill' }

	it('should fail on condition failure', async () => {
		const promise = putItem(users, user1, {
			condition(exp) { exp.where('id').exists }
		})

		await expect(promise)
			.rejects.toThrow(ConditionalCheckFailedException)
	})

	it('should fail on transaction condition failure', async () => {
		const promise = transactWrite({
			items: [
				transactPut(users, user1),
				transactPut(users, user2, {
					condition(exp) { exp.where('id').exists }
				}),
			]
		})

		await expect(promise)
			.rejects.toThrow(TransactionCanceledException)

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
