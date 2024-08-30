import { GetItemCommand } from '@aws-sdk/client-dynamodb'
import { client } from '../client.js'
import { projectionExpression, ProjectionExpression, ProjectionResponse } from '../expressions/projection.js'
import { debug } from '../helper/debug'
import { IDGenerator } from '../helper/id-generator.js'
import { AnyTable } from '../table.js'
import { PrimaryKey } from '../types/key.js'
import { Options } from '../types/options.js'

// type GetOptions<
// 	T extends AnyTableDefinition,
// 	P extends ProjectionExpression<T> | undefined
// > = Options & {
// 	consistentRead?: boolean
// 	projection?: P
// }

export const getItem = async <T extends AnyTable, P extends ProjectionExpression<T> | undefined = undefined>(
	table: T,
	key: PrimaryKey<T>,
	options: Options & {
		consistentRead?: boolean
		projection?: P
	} = {}
): Promise<ProjectionResponse<T, P> | undefined> => {
	const gen = new IDGenerator(table)

	const command = new GetItemCommand({
		TableName: table.name,
		Key: table.marshall(key) as any,
		ConsistentRead: options.consistentRead,
		ProjectionExpression: projectionExpression(options, gen),
		...gen.attributeNames(),
	})

	debug(options, command)
	const result = await client(options).send(command)

	if (result.Item) {
		return table.unmarshall(result.Item) as ProjectionResponse<T, P>
	}

	return undefined
}
