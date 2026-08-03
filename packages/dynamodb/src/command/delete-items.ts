import { BatchWriteItemCommand } from '@aws-sdk/client-dynamodb'
import { getClient } from '../client'
import { backoff } from '../helper/backoff'
import { AnyTable } from '../table'
import { PrimaryKey } from '../types/key'
import { Options } from '../types/options'
import { thenable } from './command'

type UnprocessedItems = {
	DeleteRequest: {
		Key: any
	}
}[]

export const deleteItems = <T extends AnyTable>(table: T, keys: PrimaryKey<T>[], options: Options = {}) => {
	const client = getClient(options)

	return thenable(async () => {
		const unprocessedItems: UnprocessedItems = keys.map(key => ({
			DeleteRequest: {
				Key: table.marshall(key),
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

			// DynamoDB returns throttled deletes as unprocessed items;
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
