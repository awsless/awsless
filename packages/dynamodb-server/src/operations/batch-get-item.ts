import { ValidationException } from '../errors/index.js'
import { applyProjection } from '../expressions/index.js'
import type { TableStore } from '../store/index.js'
import type { AttributeMap, ConsumedCapacity } from '../types.js'

export interface BatchGetItemInput {
	RequestItems: Record<
		string,
		{
			Keys: AttributeMap[]
			ProjectionExpression?: string
			ExpressionAttributeNames?: Record<string, string>
			ConsistentRead?: boolean
		}
	>
	ReturnConsumedCapacity?: 'INDEXES' | 'TOTAL' | 'NONE'
}

export interface BatchGetItemOutput {
	Responses?: Record<string, AttributeMap[]>
	UnprocessedKeys?: Record<
		string,
		{
			Keys: AttributeMap[]
			ProjectionExpression?: string
			ExpressionAttributeNames?: Record<string, string>
			ConsistentRead?: boolean
		}
	>
	ConsumedCapacity?: ConsumedCapacity[]
}

const MAX_BATCH_GET_ITEMS = 100

export function batchGetItem(store: TableStore, input: BatchGetItemInput): BatchGetItemOutput {
	if (!input.RequestItems) {
		throw new ValidationException('RequestItems is required')
	}

	let totalKeys = 0
	for (const tableRequest of Object.values(input.RequestItems)) {
		totalKeys += tableRequest.Keys.length
	}

	if (totalKeys > MAX_BATCH_GET_ITEMS) {
		throw new ValidationException(`Too many items requested for the BatchGetItem call. Max is ${MAX_BATCH_GET_ITEMS}`)
	}

	const responses: Record<string, AttributeMap[]> = {}
	const consumedCapacity: ConsumedCapacity[] = []

	for (const [tableName, tableRequest] of Object.entries(input.RequestItems)) {
		const table = store.getTable(tableName)
		const items: AttributeMap[] = []
		let capacityUnits = 0

		for (const key of tableRequest.Keys) {
			let item = table.getItem(key)

			if (item) {
				if (tableRequest.ProjectionExpression) {
					item = applyProjection(item, tableRequest.ProjectionExpression, tableRequest.ExpressionAttributeNames)
				}
				items.push(item)
				capacityUnits += 0.5
			}
		}

		if (items.length > 0) {
			responses[tableName] = items
		}

		if (input.ReturnConsumedCapacity && input.ReturnConsumedCapacity !== 'NONE') {
			consumedCapacity.push({
				TableName: tableName,
				CapacityUnits: capacityUnits,
				ReadCapacityUnits: capacityUnits,
			})
		}
	}

	const output: BatchGetItemOutput = {}

	if (Object.keys(responses).length > 0) {
		output.Responses = responses
	}

	if (input.ReturnConsumedCapacity && input.ReturnConsumedCapacity !== 'NONE') {
		output.ConsumedCapacity = consumedCapacity
	}

	return output
}
