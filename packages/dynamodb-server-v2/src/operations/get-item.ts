import { ValidationException } from '../errors/index.js'
import { applyProjection } from '../expressions/index.js'
import type { TableStore } from '../store/index.js'
import type { AttributeMap, ConsumedCapacity } from '../types.js'

export interface GetItemInput {
	TableName: string
	Key: AttributeMap
	ProjectionExpression?: string
	ExpressionAttributeNames?: Record<string, string>
	ConsistentRead?: boolean
	ReturnConsumedCapacity?: 'INDEXES' | 'TOTAL' | 'NONE'
}

export interface GetItemOutput {
	Item?: AttributeMap
	ConsumedCapacity?: ConsumedCapacity
}

export function getItem(store: TableStore, input: GetItemInput): GetItemOutput {
	if (!input.TableName) {
		throw new ValidationException('TableName is required')
	}

	if (!input.Key) {
		throw new ValidationException('Key is required')
	}

	const table = store.getTable(input.TableName)

	const hashKey = table.getHashKeyName()
	if (!input.Key[hashKey]) {
		throw new ValidationException(`Missing the key ${hashKey} in the key`)
	}

	const rangeKey = table.getRangeKeyName()
	if (rangeKey && !input.Key[rangeKey]) {
		throw new ValidationException(`Missing the key ${rangeKey} in the key`)
	}

	let item = table.getItem(input.Key)

	if (item && input.ProjectionExpression) {
		item = applyProjection(item, input.ProjectionExpression, input.ExpressionAttributeNames)
	}

	const output: GetItemOutput = {}

	if (item) {
		output.Item = item
	}

	if (input.ReturnConsumedCapacity && input.ReturnConsumedCapacity !== 'NONE') {
		output.ConsumedCapacity = {
			TableName: input.TableName,
			CapacityUnits: 0.5,
			ReadCapacityUnits: 0.5,
		}
	}

	return output
}
