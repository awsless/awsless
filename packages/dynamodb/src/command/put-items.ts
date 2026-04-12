import { BatchWriteItemCommand } from '@aws-sdk/client-dynamodb'
import { getClient } from '../client'
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
