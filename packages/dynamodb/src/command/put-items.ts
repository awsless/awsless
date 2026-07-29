import { BatchWriteItemCommand } from '@aws-sdk/client-dynamodb'
import { getClient } from '../client'
import { backoff } from '../helper/backoff'
import { AnyTable, Infer } from '../table'
import { Options } from '../types/options'
import { thenable } from './command'

type UnprocessedItems = {
	PutRequest: {
		Item: any
	}
}[]

export const putItems = <T extends AnyTable>(table: T, items: Infer<T>[], options: Options = {}) => {
	const client = getClient(options)

	return thenable(async () => {
		const unprocessedItems: UnprocessedItems = items.map(item => ({
			PutRequest: {
				Item: table.marshall(item),
			},
		}))

		let attempt = 0

		while (unprocessedItems.length) {
			const command = new BatchWriteItemCommand({
				RequestItems: {
					[table.name]: unprocessedItems.splice(0, 25),
				},
			})

			const result = await client.send(command)

			const resultUnprocessedItems = (result.UnprocessedItems?.[table.name] as UnprocessedItems) ?? []

			unprocessedItems.push(...resultUnprocessedItems)

			// DynamoDB returns throttled writes as unprocessed items;
			// retrying them immediately just hits the same throttle, so back
			// off and reset once a batch goes through clean.
			if (resultUnprocessedItems.length) {
				await backoff(attempt++)
			} else {
				attempt = 0
			}
		}
	})
}
