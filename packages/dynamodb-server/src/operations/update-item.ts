import { ConditionalCheckFailedException, ValidationException } from '../errors/index.js'
import { applyUpdateExpression, evaluateCondition } from '../expressions/index.js'
import type { TableStore } from '../store/index.js'
import type { AttributeMap, AttributeValue, ConsumedCapacity } from '../types.js'

export interface UpdateItemInput {
	TableName: string
	Key: AttributeMap
	UpdateExpression?: string
	ConditionExpression?: string
	ExpressionAttributeNames?: Record<string, string>
	ExpressionAttributeValues?: Record<string, AttributeValue>
	ReturnValues?: 'NONE' | 'ALL_OLD' | 'UPDATED_OLD' | 'ALL_NEW' | 'UPDATED_NEW'
	ReturnConsumedCapacity?: 'INDEXES' | 'TOTAL' | 'NONE'
	ReturnValuesOnConditionCheckFailure?: 'ALL_OLD' | 'NONE'
}

export interface UpdateItemOutput {
	Attributes?: AttributeMap
	ConsumedCapacity?: ConsumedCapacity
}

export function updateItem(store: TableStore, input: UpdateItemInput): UpdateItemOutput {
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

	const existingItem = table.getItem(input.Key)

	if (input.ConditionExpression) {
		const conditionMet = evaluateCondition(input.ConditionExpression, existingItem || {}, {
			expressionAttributeNames: input.ExpressionAttributeNames,
			expressionAttributeValues: input.ExpressionAttributeValues,
		})

		if (!conditionMet) {
			if (input.ReturnValuesOnConditionCheckFailure === 'ALL_OLD' && existingItem) {
				throw new ConditionalCheckFailedException('The conditional request failed', existingItem)
			}
			throw new ConditionalCheckFailedException('The conditional request failed')
		}
	}

	let item: AttributeMap = existingItem ? { ...existingItem } : { ...input.Key }

	if (input.UpdateExpression) {
		item = applyUpdateExpression(item, input.UpdateExpression, {
			expressionAttributeNames: input.ExpressionAttributeNames,
			expressionAttributeValues: input.ExpressionAttributeValues,
		})
	}

	for (const [key, value] of Object.entries(input.Key)) {
		item[key] = value
	}

	table.updateItem(input.Key, item)

	const output: UpdateItemOutput = {}

	switch (input.ReturnValues) {
		case 'ALL_OLD':
			if (existingItem) {
				output.Attributes = existingItem
			}
			break
		case 'ALL_NEW':
			output.Attributes = item
			break
		case 'UPDATED_OLD':
			if (existingItem && input.UpdateExpression) {
				output.Attributes = getUpdatedAttributes(existingItem, item)
			}
			break
		case 'UPDATED_NEW':
			if (input.UpdateExpression) {
				output.Attributes = getUpdatedAttributes(existingItem || {}, item)
			}
			break
	}

	if (input.ReturnConsumedCapacity && input.ReturnConsumedCapacity !== 'NONE') {
		output.ConsumedCapacity = {
			TableName: input.TableName,
			CapacityUnits: 1,
			WriteCapacityUnits: 1,
		}
	}

	return output
}

function getUpdatedAttributes(oldItem: AttributeMap, newItem: AttributeMap): AttributeMap {
	const updated: AttributeMap = {}

	for (const [key, newValue] of Object.entries(newItem)) {
		const oldValue = oldItem[key]
		if (!oldValue || JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
			updated[key] = newValue
		}
	}

	return updated
}
