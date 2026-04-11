import { BatchWriteItemCommand } from '@aws-sdk/client-dynamodb'
import chunk from 'chunk'
import { client } from '../client'
import { debug } from '../helper/debug'
import { AnyTable } from '../table'
import { PrimaryKey } from '../types/key'
import { Options } from '../types/options'

type UnprocessedItems =
	| {
			[key: string]: {
				DeleteRequest: {
					Key: any
				}
			}[]
	  }
	| undefined

export const batchDeleteItem = async <T extends AnyTable>(
	table: T,
	keys: PrimaryKey<T>[],
	options: Options = {}
): Promise<void> => {
	await Promise.all(
		chunk(keys, 25).map(async items => {
			let unprocessedItems: UnprocessedItems = {
				[table.name]: items.map(item => ({
					DeleteRequest: {
						Key: table.marshall(item),
					},
				})),
			}

			while (unprocessedItems?.[table.name]?.length) {
				const command = new BatchWriteItemCommand({
					RequestItems: unprocessedItems,
				})

				debug(options, command)

				const result = await client(options).send(command)

				unprocessedItems = result.UnprocessedItems as UnprocessedItems
			}
		})
	)
}
