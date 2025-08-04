import { ScanCommand } from '@aws-sdk/client-dynamodb'
import { client } from '../client.js'
import { ExpressionAttributes } from '../expression/attributes.js'
import { buildProjectionExpression, ProjectionExpression, ProjectionResponse } from '../expression/projection.js'
import { fromCursorString, toCursorString } from '../helper/cursor.js'
import { AnyTable, IndexNames } from '../table.js'
import { Options } from '../types/options.js'
import { iterable, thenable } from './command.js'

type ScanOptions<
	T extends AnyTable,
	P extends ProjectionExpression<T> | undefined,
	I extends IndexNames<T> | undefined,
> = Options & {
	select?: P
	index?: I
	consistentRead?: boolean
	limit?: number
	cursor?: string
	disablePreciseCursor?: boolean
}

type ScanResponse<T extends AnyTable, P extends ProjectionExpression<T> | undefined> = {
	items: ProjectionResponse<T, P>[]
	cursor?: string
}

export const scan = <
	T extends AnyTable,
	const P extends ProjectionExpression<T> | undefined = undefined,
	I extends IndexNames<T> | undefined = undefined,
>(
	table: T,
	options: ScanOptions<T, P, I> = {}
) => {
	const execute = async (cursor?: string, limit?: number) => {
		const attrs = new ExpressionAttributes(table)
		const command = new ScanCommand({
			TableName: table.name,
			IndexName: options.index?.toString(),
			ConsistentRead: options.consistentRead,
			Limit: limit ?? options.limit ?? 10,
			ExclusiveStartKey: fromCursorString(cursor),
			ProjectionExpression: buildProjectionExpression(attrs, options.select),
			...attrs.attributes(),
		})

		const result = await client(options).send(command)

		return {
			items: result.Items?.map(item => table.unmarshall(item)) || [],
			cursor: toCursorString(result.LastEvaluatedKey),
		}
	}

	return {
		...iterable<ProjectionResponse<T, P>>(options.cursor, execute),
		...thenable<ScanResponse<T, P>>(async () => {
			const result = await execute(options.cursor)

			// FIX the problem where DynamoDB will return a cursor
			// even when no more items are available.

			if (result.cursor && !options.disablePreciseCursor) {
				const more = await execute(result.cursor, 1)

				if (more.items.length === 0) {
					delete result.cursor
				}
			}

			return result
		}),
	}
}
