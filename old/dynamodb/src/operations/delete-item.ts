import { DeleteItemCommand } from '@aws-sdk/client-dynamodb'
import { conditionExpression } from '../expressions/condition.js'
import { ReturnResponse, LimitedReturnValues } from '../expressions/return.js'
import { client } from '../client.js'
import { IDGenerator } from '../helper/id-generator.js'
import { AnyTableDefinition } from '../table.js'
import { PrimaryKey } from '../types/key.js'
import { MutateOptions } from '../types/options.js'
import { debug } from '../helper/debug.js'

export const deleteItem = async <T extends AnyTableDefinition, R extends LimitedReturnValues = 'NONE'>(
	table: T,
	key: PrimaryKey<T>,
	options: MutateOptions<T, R> = {}
): Promise<ReturnResponse<T, R>> => {
	const gen = new IDGenerator(table)
	const command = new DeleteItemCommand({
		TableName: table.name,
		Key: table.marshall(key),
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
