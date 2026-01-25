import { ValidationException } from '../errors/index.js'
import type { TableStore } from '../store/index.js'
import type { AttributeMap, ConsumedCapacity } from '../types.js'

export interface BatchWriteItemInput {
	RequestItems: Record<
		string,
		Array<
			| { PutRequest: { Item: AttributeMap } }
			| { DeleteRequest: { Key: AttributeMap } }
		>
	>
	ReturnConsumedCapacity?: 'INDEXES' | 'TOTAL' | 'NONE'
	ReturnItemCollectionMetrics?: 'SIZE' | 'NONE'
}

export interface BatchWriteItemOutput {
	UnprocessedItems?: Record<
		string,
		Array<
			| { PutRequest: { Item: AttributeMap } }
			| { DeleteRequest: { Key: AttributeMap } }
		>
	>
	ConsumedCapacity?: ConsumedCapacity[]
	ItemCollectionMetrics?: Record<
		string,
		Array<{
			ItemCollectionKey: AttributeMap
			SizeEstimateRangeGB: [number, number]
		}>
	>
}

const MAX_BATCH_WRITE_ITEMS = 25

export function batchWriteItem(store: TableStore, input: BatchWriteItemInput): BatchWriteItemOutput {
	if (!input.RequestItems) {
		throw new ValidationException('RequestItems is required')
	}

	let totalItems = 0
	for (const tableRequests of Object.values(input.RequestItems)) {
		totalItems += tableRequests.length
	}

	if (totalItems > MAX_BATCH_WRITE_ITEMS) {
		throw new ValidationException(`Too many items requested for the BatchWriteItem call. Max is ${MAX_BATCH_WRITE_ITEMS}`)
	}

	const consumedCapacity: ConsumedCapacity[] = []

	for (const [tableName, requests] of Object.entries(input.RequestItems)) {
		const table = store.getTable(tableName)
		let capacityUnits = 0

		for (const request of requests) {
			if ('PutRequest' in request) {
				const item = request.PutRequest.Item

				const hashKey = table.getHashKeyName()
				if (!item[hashKey]) {
					throw new ValidationException(`Missing the key ${hashKey} in the item`)
				}

				const rangeKey = table.getRangeKeyName()
				if (rangeKey && !item[rangeKey]) {
					throw new ValidationException(`Missing the key ${rangeKey} in the item`)
				}

				table.putItem(item)
				capacityUnits += 1
			} else if ('DeleteRequest' in request) {
				const key = request.DeleteRequest.Key

				const hashKey = table.getHashKeyName()
				if (!key[hashKey]) {
					throw new ValidationException(`Missing the key ${hashKey} in the key`)
				}

				const rangeKey = table.getRangeKeyName()
				if (rangeKey && !key[rangeKey]) {
					throw new ValidationException(`Missing the key ${rangeKey} in the key`)
				}

				table.deleteItem(key)
				capacityUnits += 1
			}
		}

		if (input.ReturnConsumedCapacity && input.ReturnConsumedCapacity !== 'NONE') {
			consumedCapacity.push({
				TableName: tableName,
				CapacityUnits: capacityUnits,
				WriteCapacityUnits: capacityUnits,
			})
		}
	}

	const output: BatchWriteItemOutput = {}

	if (input.ReturnConsumedCapacity && input.ReturnConsumedCapacity !== 'NONE') {
		output.ConsumedCapacity = consumedCapacity
	}

	return output
}
