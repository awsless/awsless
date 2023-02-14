
import { PutCommand, PutCommandOutput } from '@aws-sdk/lib-dynamodb'
import { Item, MutateOptions } from '../types.js'
import { extendMutateCommand } from '../helper/mutate.js'
import { send } from '../helper/send.js'
import { Table } from '../table.js'

export type PutOptions = MutateOptions

export const putItem = async <T extends Table<Item, keyof Item>>(
	table: T,
	item: T['model'],
	options:PutOptions = {}
): Promise<T['model'] | undefined> => {
	const command = new PutCommand({
		TableName: table.toString(),
		Item: item,
	})

	extendMutateCommand(command, options)

	const result = await send(command, options) as PutCommandOutput

	return result.Attributes
}
