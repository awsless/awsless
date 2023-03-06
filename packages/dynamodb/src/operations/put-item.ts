
import { client } from '../client.js'
import { IDGenerator } from '../helper/id-generator.js'
import { ReturnResponse, LimitedReturnValues } from '../expressions/return.js'
import { conditionExpression } from '../expressions/conditions.js'
import { MutateOptions } from '../types/options.js'
import { AnyTableDefinition } from '../table.js'
import { PutItemCommand } from '@aws-sdk/client-dynamodb'

export const putItem = async <
	T extends AnyTableDefinition,
	R extends LimitedReturnValues = 'NONE'
>(
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

	const result = await client(options).send(command)

	if(result.Attributes) {
		return table.unmarshall(result.Attributes) as ReturnResponse<T, R>
	}

	return undefined as ReturnResponse<T, R>
}
