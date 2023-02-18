
import { mockDynamoDB, putItem, ql, Table, ConditionalCheckFailedException, transactWrite, transactPut, TransactionCanceledException } from '../src/index'
import { tables } from './aws/tables'

describe('Condition Exeption', () => {

	mockDynamoDB({ tables })

	type User = {
		id: number
		name: string
	}

	const users = new Table<User, 'id'>('users')
	const user1 = { id: 1, name: 'John' }
	const user2 = { id: 2, name: 'Gill' }

	it('should fail on condition failure', async () => {
		const promise = putItem(users, user1, {
			condition: ql`attribute_exists(#id)`
		})

		await expect(promise).rejects.toThrow(ConditionalCheckFailedException)
	})

	it('should fail on transaction condition failure', async () => {
		const promise = transactWrite({
			items: [
				transactPut(users, user1),
				transactPut(users, user2, {
					condition: ql`attribute_exists(#id)`
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
