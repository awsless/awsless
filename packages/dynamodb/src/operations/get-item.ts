
import { projectionExpression, ProjectionExpression, ProjectionResponse } from '../expressions/projection.js'
import { client } from '../client.js'
import { IDGenerator } from '../helper/id-generator.js'
import { AnyTableDefinition } from '../table.js'
import { Options } from '../types/options.js'
import { PrimaryKey } from '../types/key.js'
import { GetItemCommand } from '@aws-sdk/client-dynamodb'

type GetOptions<T extends AnyTableDefinition, P extends ProjectionExpression<T> | undefined> = Options & {
	consistentRead?: boolean
	projection?: P
}

export const getItem = async <T extends AnyTableDefinition, P extends ProjectionExpression<T> | undefined>(
	table: T,
	key: PrimaryKey<T>,
	options: GetOptions<T, P> = {}
): Promise<ProjectionResponse<T, P> | undefined> => {

	const gen = new IDGenerator(table)
	const command = new GetItemCommand({
		TableName: table.name,
		Key: table.marshall(key),
		ConsistentRead: options.consistentRead,
		ProjectionExpression: projectionExpression(options, gen),
		...gen.attributeNames(),
	})

	const result = await client(options).send(command)

	if(result.Item) {
		return table.unmarshall(result.Item)
	}

	return undefined
}
