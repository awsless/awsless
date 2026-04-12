import { BatchWriteItemCommand } from '@aws-sdk/client-dynamodb'
import { getClient } from '../client'
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

		while (unprocessedItems.length) {
			const command = new BatchWriteItemCommand({
				RequestItems: {
					[table.name]: unprocessedItems.splice(0, 25),
				},
			})

			const result = await client.send(command)

			const resultUnprocessedItems = (result.UnprocessedItems?.[table.name] as UnprocessedItems) ?? []

			unprocessedItems.push(...resultUnprocessedItems)
		}
	})
}
