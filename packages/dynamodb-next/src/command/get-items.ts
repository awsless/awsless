import { AttributeValue, BatchGetItemCommand } from '@aws-sdk/client-dynamodb'
import { getClient } from '../client'
import { ExpressionAttributes } from '../expression/attributes'
import { buildProjectionExpression, ProjectionExpression, ProjectionResponse } from '../expression/projection'
import { AnyTable } from '../table'
import { PrimaryKey } from '../types/key'
import { Options } from '../types/options'
import { Thenable, thenable } from './command'

type BatchGetOptions<T extends AnyTable, P extends ProjectionExpression<T> | undefined, F extends boolean> = Options & {
	select?: P
	consistentRead?: boolean
	filterNonExistentItems?: F
}

type BatchGetItem = {
	<T extends AnyTable, P extends ProjectionExpression<T> | undefined>(
		table: T,
		keys: PrimaryKey<T>[],
		options?: BatchGetOptions<T, P, false>
	): Thenable<(ProjectionResponse<T, P> | undefined)[]>

	<T extends AnyTable, P extends ProjectionExpression<T> | undefined>(
		table: T,
		keys: PrimaryKey<T>[],
		options?: BatchGetOptions<T, P, true>
	): Thenable<ProjectionResponse<T, P>[]>
}

type UnprocessedKeys = Record<string, AttributeValue>[]

export const getItems: BatchGetItem = <T extends AnyTable, P extends ProjectionExpression<T> | undefined = undefined>(
	table: T,
	keys: PrimaryKey<T>[],
	options: BatchGetOptions<T, P, boolean> = { filterNonExistentItems: false }
) => {
	const client = getClient(options)

	return thenable<Array<ProjectionResponse<T, P> | undefined>>(async () => {
		const response: (ProjectionResponse<T, P> | undefined)[] = []
		const unprocessedKeys: UnprocessedKeys = keys.map(key => table.marshall(key))

		const attrs = new ExpressionAttributes(table)
		const projection = buildProjectionExpression(attrs, options.select)
		const attributes = attrs.attributeNames()

		while (unprocessedKeys.length) {
			const command = new BatchGetItemCommand({
				RequestItems: {
					[table.name]: {
						Keys: unprocessedKeys.splice(0, 100),
						ConsistentRead: options.consistentRead,
						ProjectionExpression: projection,
						...attributes,
					},
				},
			})

			const result = await client.send(command)

			const resultUnprocessedKeys = result.UnprocessedKeys?.[table.name]?.Keys ?? []
			const resultProcessedItems = (result.Responses?.[table.name] ?? []).map(item =>
				table.unmarshall(item, options.select)
			)

			unprocessedKeys.push(...resultUnprocessedKeys)
			response.push(...resultProcessedItems)
		}

		const list = keys.map(key => {
			return response.find(item => {
				for (const i in key) {
					const k = i as keyof PrimaryKey<T>

					if (key[k] !== item?.[k]) {
						return false
					}
				}

				return true
			})
		})

		if (options.filterNonExistentItems) {
			return list.filter(item => !!item)
		}

		return list
	})
}
