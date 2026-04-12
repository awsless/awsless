import { ValidationException } from '../errors/index.js'
import { applyProjection } from '../expressions/index.js'
import type { TableStore } from '../store/index.js'
import type { AttributeMap, ConsumedCapacity } from '../types.js'

export interface TransactGetItemsInput {
	TransactItems: Array<{
		Get: {
			TableName: string
			Key: AttributeMap
			ProjectionExpression?: string
			ExpressionAttributeNames?: Record<string, string>
		}
	}>
	ReturnConsumedCapacity?: 'INDEXES' | 'TOTAL' | 'NONE'
}

export interface TransactGetItemsOutput {
	Responses?: Array<{ Item?: AttributeMap }>
	ConsumedCapacity?: ConsumedCapacity[]
}

const MAX_TRANSACT_ITEMS = 100

export function transactGetItems(store: TableStore, input: TransactGetItemsInput): TransactGetItemsOutput {
	if (!input.TransactItems) {
		throw new ValidationException('TransactItems is required')
	}

	if (input.TransactItems.length > MAX_TRANSACT_ITEMS) {
		throw new ValidationException(`Too many items in the TransactGetItems call. Max is ${MAX_TRANSACT_ITEMS}`)
	}

	const responses: Array<{ Item?: AttributeMap }> = []
	const consumedCapacity: Map<string, number> = new Map()

	for (const transactItem of input.TransactItems) {
		const { Get: getRequest } = transactItem

		if (!getRequest.TableName) {
			throw new ValidationException('TableName is required in Get request')
		}

		if (!getRequest.Key) {
			throw new ValidationException('Key is required in Get request')
		}

		const table = store.getTable(getRequest.TableName)

		let item = table.getItem(getRequest.Key)

		if (item && getRequest.ProjectionExpression) {
			item = applyProjection(item, getRequest.ProjectionExpression, getRequest.ExpressionAttributeNames)
		}

		responses.push({ Item: item })

		const current = consumedCapacity.get(getRequest.TableName) || 0
		consumedCapacity.set(getRequest.TableName, current + 2)
	}

	const output: TransactGetItemsOutput = {
		Responses: responses,
	}

	if (input.ReturnConsumedCapacity && input.ReturnConsumedCapacity !== 'NONE') {
		output.ConsumedCapacity = Array.from(consumedCapacity.entries()).map(([tableName, units]) => ({
			TableName: tableName,
			CapacityUnits: units,
			ReadCapacityUnits: units,
		}))
	}

	return output
}
