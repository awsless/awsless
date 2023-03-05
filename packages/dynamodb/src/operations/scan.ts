
import { ScanCommand } from '@aws-sdk/client-dynamodb'
import { projectionExpression, ProjectionExpression, ProjectionResponse } from '../expressions/projection.js'
import { client } from '../client.js'
import { IDGenerator } from '../helper/id-generator.js'
import { AnyTableDefinition, IndexNames } from '../table.js'
import { CursorKey } from '../types/key.js'
import { Options } from '../types/options.js'

type ScanOptions<
	T extends AnyTableDefinition,
	P extends ProjectionExpression<T> | undefined,
	I extends IndexNames<T> | undefined
> = Options & {
	projection?: P
	index?: I
	consistentRead?: boolean
	limit?: number
	cursor?: CursorKey<T, I>
}

type ScanResponse<
	T extends AnyTableDefinition,
	P extends ProjectionExpression<T> | undefined,
	I extends IndexNames<T> | undefined
> = {
	count: number
	items: ProjectionResponse<T, P>[]
	cursor?: CursorKey<T, I>
}

export const scan = async <
	T extends AnyTableDefinition,
	P extends ProjectionExpression<T> | undefined = undefined,
	I extends IndexNames<T> | undefined = undefined
>(
	table: T,
	options: ScanOptions<T, P, I> = {}
): Promise<ScanResponse<T, P, I>> => {

	const gen = new IDGenerator(table)
	const command = new ScanCommand({
		TableName: table.name,
		IndexName: options.index,
		ConsistentRead: options.consistentRead,
		Limit: options.limit || 10,
		ExclusiveStartKey: options.cursor && table.marshall(options.cursor),
		ProjectionExpression: projectionExpression(options, gen),
		...gen.attributeNames(),
	})

	const result = await client(options).send(command)

	return {
		count: result.Count || 0,
		items: result.Items?.map(item => table.unmarshall(item)) || [],
		cursor: result.LastEvaluatedKey && table.unmarshall(result.LastEvaluatedKey) as CursorKey<T, I>,
	}
}
