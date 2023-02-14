
import { DeleteCommand, DeleteCommandOutput } from '@aws-sdk/lib-dynamodb'
import { Item, MutateOptions } from '../types.js'
import { extendMutateCommand } from '../helper/mutate.js'
import { send } from '../helper/send.js'
import { Table } from '../table.js'

export type DeleteOptions = MutateOptions

export const deleteItem = async <T extends Table<Item, keyof Item>>(
	table: T,
	key: T['key'],
	options:DeleteOptions = {}
): Promise<T['model'] | undefined> => {
// export const deleteItem = async <T extends Item>(table: string, key: Key, options:DeleteOptions = {}): Promise<T | undefined> => {
	const command = new DeleteCommand({
		TableName: table.name,
		Key: key,
	})

	extendMutateCommand(command, options)

	const result = await send(command, options) as DeleteCommandOutput

	return result.Attributes
}
