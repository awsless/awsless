
import { describe, it, expect } from 'vitest'
import { mockDynamoDB } from '@awsless/test'
import { ql, scan, transactWrite, transactPut, transactConditionCheck, Table } from '../src/index'
import { TransactionCanceledException } from '@aws-sdk/client-dynamodb'

describe('DynamoDB Transact', () => {

	mockDynamoDB({ path: './test/aws/dynamodb.yml' })

	type Post = {
		userId: number
		id: number
		title: string
	}

	const posts = new Table<Post, 'userId' | 'id'>('posts')

	it('should transact', async () => {
		await transactWrite({
			items: [
				transactConditionCheck(posts, { userId: 1, id: 0 }, {
					condition: ql`attribute_not_exists(#id)`
				}),

				transactPut(posts, { userId: 1, id: 1, title: '' }),
				transactPut(posts, { userId: 1, id: 2, title: '' }),
				transactPut(posts, { userId: 1, id: 3, title: '' }),
			]
		})

		const result = await scan(posts)
		expect(result).toStrictEqual({
			cursor: undefined,
			count: 3,
			items: [
				{ userId: 1, id: 1, title: '' },
				{ userId: 1, id: 2, title: '' },
				{ userId: 1, id: 3, title: '' }
			]}
		)
	})

	it('should throw on condition error', async () => {
		const promise = transactWrite({
			items: [
				transactConditionCheck(posts, { userId: 1, id: 1 }, {
					condition: ql`attribute_not_exists(#id)`
				}),
				transactPut(posts, { userId: 1, id: 4, title: '' }),
			]
		})

		await expect(promise).rejects.toThrow(TransactionCanceledException)

		const result = await scan(posts)
		expect(result).toStrictEqual({
			cursor: undefined,
			count: 3,
			items: [
				{ userId: 1, id: 1, title: '' },
				{ userId: 1, id: 2, title: '' },
				{ userId: 1, id: 3, title: '' }
			]}
		)
	})
})
