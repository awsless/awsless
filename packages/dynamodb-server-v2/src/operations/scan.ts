import { ResourceNotFoundException, ValidationException } from '../errors/index.js'
import { applyProjection, evaluateCondition } from '../expressions/index.js'
import type { TableStore } from '../store/index.js'
import type { AttributeMap, AttributeValue, ConsumedCapacity } from '../types.js'

export interface ScanInput {
	TableName: string
	IndexName?: string
	FilterExpression?: string
	ProjectionExpression?: string
	ExpressionAttributeNames?: Record<string, string>
	ExpressionAttributeValues?: Record<string, AttributeValue>
	Limit?: number
	ExclusiveStartKey?: AttributeMap
	ConsistentRead?: boolean
	Select?: 'ALL_ATTRIBUTES' | 'ALL_PROJECTED_ATTRIBUTES' | 'SPECIFIC_ATTRIBUTES' | 'COUNT'
	ReturnConsumedCapacity?: 'INDEXES' | 'TOTAL' | 'NONE'
	Segment?: number
	TotalSegments?: number
}

export interface ScanOutput {
	Items?: AttributeMap[]
	Count: number
	ScannedCount: number
	LastEvaluatedKey?: AttributeMap
	ConsumedCapacity?: ConsumedCapacity
}

export function scan(store: TableStore, input: ScanInput): ScanOutput {
	if (!input.TableName) {
		throw new ValidationException('TableName is required')
	}

	const table = store.getTable(input.TableName)

	let items: AttributeMap[]
	let lastEvaluatedKey: AttributeMap | undefined

	if (input.IndexName) {
		if (!table.hasIndex(input.IndexName)) {
			throw new ResourceNotFoundException(`Index ${input.IndexName} not found`)
		}
		const result = table.scanIndex(input.IndexName, undefined, input.ExclusiveStartKey)
		items = result.items
		lastEvaluatedKey = result.lastEvaluatedKey
	} else {
		const result = table.scan(undefined, input.ExclusiveStartKey)
		items = result.items
		lastEvaluatedKey = result.lastEvaluatedKey
	}

	if (input.TotalSegments !== undefined && input.Segment !== undefined) {
		const segmentSize = Math.ceil(items.length / input.TotalSegments)
		const start = input.Segment * segmentSize
		const end = start + segmentSize
		items = items.slice(start, end)
	}

	const scannedCount = items.length

	if (input.FilterExpression) {
		items = items.filter(item =>
			evaluateCondition(input.FilterExpression, item, {
				expressionAttributeNames: input.ExpressionAttributeNames,
				expressionAttributeValues: input.ExpressionAttributeValues,
			})
		)
	}

	if (input.Limit && items.length > input.Limit) {
		items = items.slice(0, input.Limit)
		if (items.length > 0) {
			const lastItem = items[items.length - 1]!
			lastEvaluatedKey = {}
			const hashKey = table.getHashKeyName()
			const rangeKey = table.getRangeKeyName()
			if (lastItem[hashKey]) {
				lastEvaluatedKey[hashKey] = lastItem[hashKey]
			}
			if (rangeKey && lastItem[rangeKey]) {
				lastEvaluatedKey[rangeKey] = lastItem[rangeKey]
			}
			if (input.IndexName) {
				const indexKeySchema = table.getIndexKeySchema(input.IndexName)
				if (indexKeySchema) {
					for (const key of indexKeySchema) {
						const attrValue = lastItem[key.AttributeName]
						if (attrValue) {
							lastEvaluatedKey[key.AttributeName] = attrValue
						}
					}
				}
			}
		}
	}

	if (input.ProjectionExpression) {
		items = items.map(item => applyProjection(item, input.ProjectionExpression, input.ExpressionAttributeNames))
	}

	const output: ScanOutput = {
		Count: items.length,
		ScannedCount: scannedCount,
	}

	if (input.Select !== 'COUNT') {
		output.Items = items
	}

	if (lastEvaluatedKey && Object.keys(lastEvaluatedKey).length > 0) {
		output.LastEvaluatedKey = lastEvaluatedKey
	}

	if (input.ReturnConsumedCapacity && input.ReturnConsumedCapacity !== 'NONE') {
		output.ConsumedCapacity = {
			TableName: input.TableName,
			CapacityUnits: Math.max(0.5, scannedCount * 0.5),
			ReadCapacityUnits: Math.max(0.5, scannedCount * 0.5),
		}
	}

	return output
}
