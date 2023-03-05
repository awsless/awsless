
import { BatchGetItemCommand } from "@aws-sdk/client-dynamodb"
import { client } from "../client"
import { projectionExpression, ProjectionExpression, ProjectionResponse } from "../expressions/projection"
import { IDGenerator } from "../helper/id-generator"
import { AnyTableDefinition } from "../table"
import { PrimaryKey } from "../types/key"
import { Options } from "../types/options"

type BatchGetOptions<
	T extends AnyTableDefinition,
	P extends ProjectionExpression<T> | undefined,
	F extends boolean
> = Options & {
	projection?: P
	consistentRead?: boolean
	filterNonExistentItems?: F
}

type BatchGetItem = {
	<
		T extends AnyTableDefinition,
		P extends ProjectionExpression<T> | undefined
	>(
		table:T,
		keys: PrimaryKey<T>[],
		options?:BatchGetOptions<T, P, false>
	): Promise<(ProjectionResponse<T, P> | undefined)[]>

	<
		T extends AnyTableDefinition,
		P extends ProjectionExpression<T> | undefined
	>(
		table:T,
		keys: PrimaryKey<T>[],
		options?:BatchGetOptions<T, P, true>
	): Promise<ProjectionResponse<T, P>[]>
}

export const batchGetItem:BatchGetItem = async <
	T extends AnyTableDefinition,
	P extends ProjectionExpression<T> | undefined = undefined
>(
	table: T,
	keys: PrimaryKey<T>[],
	options: BatchGetOptions<T, P, boolean> = { filterNonExistentItems: false }
):  Promise<(ProjectionResponse<T, P> | undefined)[]> => {

	let response: (ProjectionResponse<T, P> | undefined)[] = []
	let unprocessedKeys: PrimaryKey<T>[] = keys.map(key => table.marshall(key))

	const gen = new IDGenerator(table)
	const projection = projectionExpression(options, gen)
	const attributes = gen.attributeNames()

	while(unprocessedKeys.length) {
		const command = new BatchGetItemCommand({
			RequestItems: {
				[ table.name ]: {
					Keys: unprocessedKeys,
					ConsistentRead: options.consistentRead,
					ProjectionExpression: projection,
					...attributes,
				}
			}
		})

		const result = await client(options).send(command)

		unprocessedKeys = (result.UnprocessedKeys?.[ table.name ]?.Keys || []) as PrimaryKey<T>[]

		response = [
			...response,
			...(result.Responses?.[ table.name ] || []).map(
				item => table.unmarshall(item)
			)
		]
	}

	const list = keys.map(key => {
		return response.find(item => {
			for(const i in key) {
				const k = i as keyof PrimaryKey<T>

				if(key[k] !== item?.[k]) {
					return false
				}
			}

			return true
		})
	})

	if(options.filterNonExistentItems) {
		return list.filter(item => !!item)
	}

	return list
}
