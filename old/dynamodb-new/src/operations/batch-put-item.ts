import { BatchWriteItemCommand } from '@aws-sdk/client-dynamodb'
import chunk from 'chunk'
import { client } from '../client'
import { debug } from '../helper/debug'
import { AnyTable } from '../table'
import { Options } from '../types/options'

type UnprocessedItems =
	| {
			[key: string]: {
				PutRequest: {
					Item: any
				}
			}[]
	  }
	| undefined

export const batchPutItem = async <T extends AnyTable>(
	table: T,
	items: T['schema']['INPUT'][],
	options: Options = {}
): Promise<void> => {
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

				debug(options, command)

				const result = await client(options).send(command)

				unprocessedItems = result.UnprocessedItems as UnprocessedItems
			}
		})
	)
}
