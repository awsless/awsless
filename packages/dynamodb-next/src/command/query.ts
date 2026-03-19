import { QueryCommand } from '@aws-sdk/client-dynamodb'
import { getClient } from '../client'
import { ExpressionAttributes } from '../expression/attributes'
import { buildConditionExpression } from '../expression/condition'
import { KeyConditionExpression } from '../expression/key-condition'
import { buildProjectionExpression, ProjectionExpression, ProjectionResponse } from '../expression/projection'
import { fromCursorString, toCursorString } from '../helper/cursor'
import { AnyTable, IndexNames } from '../table'
import { QueryKey } from '../types/key'
import { Options } from '../types/options'
import { iterable, thenable } from './command'

type QueryOptions<
	T extends AnyTable,
	P extends ProjectionExpression<T> | undefined,
	I extends IndexNames<T> | undefined,
> = Options & {
	where?: KeyConditionExpression<T, I>
	select?: P
	index?: I
	consistentRead?: boolean
	sort?: 'asc' | 'desc'
	/** @deprecated Use `sort` instead */
	order?: 'asc' | 'desc'
	limit?: number
	cursor?: string
	disablePreciseCursor?: boolean
}

type QueryResponse<T extends AnyTable, P extends ProjectionExpression<T> | undefined> = {
	items: ProjectionResponse<T, P>[]
	cursor?: string
}

export const query = <
	T extends AnyTable,
	const P extends ProjectionExpression<T> | undefined = undefined,
	I extends IndexNames<T> | undefined = undefined,
>(
	table: T,
	key: QueryKey<T, I>,
	options: QueryOptions<T, P, I> = {}
) => {
	const client = getClient(options)

	const execute = async (cursor?: string, limit?: number) => {
		const sort = options.order ?? options.sort
		const attrs = new ExpressionAttributes(table)
		const command = new QueryCommand({
			TableName: table.name,
			IndexName: options.index,
			KeyConditionExpression: buildConditionExpression(attrs, e => [
				...Object.entries(key).map(([k, v]) => e(k).eq(v)),
				...(options.where ? [options.where(e)] : []),
			]),
			ConsistentRead: options.consistentRead,
			ScanIndexForward: sort === 'desc' ? false : true,
			ExclusiveStartKey: fromCursorString(cursor),
			ProjectionExpression: buildProjectionExpression(attrs, options.select),
			Limit: limit ?? options.limit ?? 10,
			...attrs.attributes(),
		})

		// console.log(command.input)

		const result = await client.send(command)

		return {
			items: result.Items?.map(item => table.unmarshall(item, options.select)) ?? [],
			cursor: toCursorString(result.LastEvaluatedKey),
		}
	}

	return {
		...iterable<ProjectionResponse<T, P>>(options.cursor, execute),
		...thenable<QueryResponse<T, P>>(async () => {
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
