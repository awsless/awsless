import { BatchWriteItemCommand } from '@aws-sdk/client-dynamodb'
import chunk from 'chunk'
import { client } from '../client'
import { debug } from '../helper/debug'
import { AnyTableDefinition } from '../table'
import { Options } from '../types/options'
import { PrimaryKey } from '../types/key'

type UnprocessedItems<T extends AnyTableDefinition> =
	| {
			[key: string]: {
				UpdateRequest: {
					Key: PrimaryKey<T>
				}
			}[]
	  }
	| undefined

export const batchUpdateItem = async <T extends AnyTableDefinition>(
	table: T,
	keys: PrimaryKey<T>[],
	options: Options = {}
): Promise<void> => {
	await Promise.all(
		chunk(keys, 25).map(async keys => {
			let unprocessedItems: UnprocessedItems<T> = {
				[table.name]: keys.map(key => ({
					UpdateRequest: {
						Key: table.marshall(key),
					},
				})),
			}

			while (unprocessedItems?.[table.name]?.length) {
				const command = new BatchWriteItemCommand({
					RequestItems: unprocessedItems,
				})

				debug(options, command)

				const result = await client(options).send(command)

				unprocessedItems = result.UnprocessedItems as UnprocessedItems<T>
			}
		})
	)
}
