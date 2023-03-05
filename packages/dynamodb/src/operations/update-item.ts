
import { client } from '../client.js'
import { UpdateItemCommand } from '@aws-sdk/client-dynamodb'
import { MutateOptions } from '../types/options.js'
import { conditionExpression } from '../expressions/conditions.js'
import { ReturnResponse, ReturnValues } from '../expressions/return.js'
import { AnyTableDefinition } from '../table.js'
import { PrimaryKey } from '../types/key.js'
import { IDGenerator } from '../helper/id-generator.js'
import { updateExpression, UpdateExpression } from '../expressions/update.js'

type UpdateOptions<
	T extends AnyTableDefinition,
	R extends ReturnValues = 'NONE'
> = MutateOptions<T, R> & {
	update: (exp:UpdateExpression<T>) => void
}

export const updateItem = async <
	T extends AnyTableDefinition,
	R extends ReturnValues = 'NONE'
>(
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

	const result = await client(options).send(command)

	if(result.Attributes) {
		return table.unmarshall(result.Attributes) as ReturnResponse<T, R>
	}

	return undefined as ReturnResponse<T, R>
}
