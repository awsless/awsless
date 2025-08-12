import { BatchWriteItemCommand } from '@aws-sdk/client-dynamodb'
import chunk from 'chunk'
import { client } from '../client'
import { AnyTable, Infer } from '../table'
import { Options } from '../types/options'
import { thenable } from './command'

type UnprocessedItems =
	| {
			[key: string]: {
				PutRequest: {
					Item: any
				}
			}[]
	  }
	| undefined

export const putItems = <T extends AnyTable>(table: T, items: Infer<T>[], options: Options = {}) => {
	return thenable(async () => {
		await Promise.all(
			chunk(items, 25).map(async items => {
				let unprocessedItems: UnprocessedItems = {
					[table.name]: items.map(item => ({
						PutRequest: {
							Item: table.marshall(item),
						},
					})),
				}

				while (unprocessedItems?.[table.name]?.length) {
					const command = new BatchWriteItemCommand({
						RequestItems: unprocessedItems,
					})

					const result = await client(options).send(command)

					unprocessedItems = result.UnprocessedItems as UnprocessedItems
				}
			})
		)
	})
}
