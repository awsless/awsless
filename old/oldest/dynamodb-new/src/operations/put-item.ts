import { PutItemCommand } from '@aws-sdk/client-dynamodb'
import { client } from '../client.js'
import { conditionExpression } from '../expressions/condition.js'
import { LimitedReturnValues, ReturnResponse } from '../expressions/return.js'
import { debug } from '../helper/debug.js'
import { IDGenerator } from '../helper/id-generator.js'
import { AnyTable } from '../table.js'
import { MutateOptions } from '../types/options.js'

export const putItem = async <T extends AnyTable, R extends LimitedReturnValues = 'NONE'>(
	table: T,
	item: T['schema']['INPUT'],
	options: MutateOptions<T, R> = {}
): Promise<ReturnResponse<T, R>> => {
	const gen = new IDGenerator(table)
	const command = new PutItemCommand({
		TableName: table.name,
		Item: table.marshall(item),
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
