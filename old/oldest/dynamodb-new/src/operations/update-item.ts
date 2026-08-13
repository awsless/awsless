import { UpdateItemCommand } from '@aws-sdk/client-dynamodb'
import { client } from '../client.js'
import { conditionExpression } from '../expressions/condition.js'
import { ReturnResponse, ReturnValues } from '../expressions/return.js'
import { updateExpression, UpdateExpression } from '../expressions/update.js'
import { debug } from '../helper/debug.js'
import { IDGenerator } from '../helper/id-generator.js'
import { AnyTable } from '../table.js'
import { PrimaryKey } from '../types/key.js'
import { MutateOptions } from '../types/options.js'

type UpdateOptions<T extends AnyTable, R extends ReturnValues = 'NONE'> = MutateOptions<T, R> & {
	update: (exp: UpdateExpression<T>) => UpdateExpression<T>
}

export const updateItem = async <T extends AnyTable, R extends ReturnValues = 'NONE'>(
	table: T,
	key: PrimaryKey<T>,
	options: UpdateOptions<T, R>
): Promise<ReturnResponse<T, R>> => {
	const gen = new IDGenerator(table)
	const command = new UpdateItemCommand({
		TableName: table.name,
		Key: table.marshall(key),
		UpdateExpression: updateExpression<T>(options, gen),
		ConditionExpression: conditionExpression<T>(options, gen),
		ReturnValues: options.return,
		...gen.attributes(),
	})

	debug(options, command)

	const result = await client(options).send(command)

	if (result.Attributes) {
		return table.unmarshall(result.Attributes) as ReturnResponse<T, R>
	}

	return undefined as ReturnResponse<T, R>
}
