import { QueryCommand } from "@aws-sdk/client-dynamodb"
import { client } from "../client"
import { Combine, KeyCondition, keyConditionExpression } from "../expressions/key-condition"
import { projectionExpression, ProjectionExpression, ProjectionResponse } from "../expressions/projection"
import { debug } from "../helper/debug"
import { IDGenerator } from "../helper/id-generator"
import { AnyTableDefinition, IndexNames } from "../table"
import { CursorKey } from "../types/key"
import { Options } from "../types/options"

type QueryOptions<
	T extends AnyTableDefinition,
	P extends ProjectionExpression<T> | undefined,
	I extends IndexNames<T> | undefined
> = Options & {
	keyCondition: (exp: KeyCondition<T, I>) => Combine<T, I>
	projection?: P
	index?: I
	consistentRead?: boolean
	forward?: boolean
	limit?: number
	cursor?: CursorKey<T, I>
}

type QueryResponse<
	T extends AnyTableDefinition,
	P extends ProjectionExpression<T> | undefined,
	I extends IndexNames<T> | undefined
> = {
	count: number
	items: ProjectionResponse<T, P>[]
	cursor?: CursorKey<T, I>
}

export const query = async <
	T extends AnyTableDefinition,
	P extends ProjectionExpression<T> | undefined = undefined,
	I extends IndexNames<T> | undefined = undefined
>(
	table: T,
	options: QueryOptions<T, P, I>
): Promise<QueryResponse<T, P, I>> => {
	const { forward = true } = options

	const gen = new IDGenerator(table)
	const command = new QueryCommand({
		TableName: table.name,
		IndexName: options.index,
		KeyConditionExpression: keyConditionExpression(options, gen),
		ConsistentRead: options.consistentRead,
		ScanIndexForward: forward,
		Limit: options.limit || 10,
		ExclusiveStartKey: options.cursor && table.marshall(options.cursor),
		ProjectionExpression: projectionExpression(options, gen),
		...gen.attributes()
	})

	// console.log('INPUT', command.input);

	debug(options, command)
	const result = await client(options).send(command)

	// console.log('RESULT', result);

	return {
		count: result.Count || 0,
		items: result.Items?.map(item => table.unmarshall(item)) || [],
		cursor: result.LastEvaluatedKey && (table.unmarshall(result.LastEvaluatedKey) as CursorKey<T, I>),
	}
}
