import { ConditionalCheckFailedException, ValidationException } from '../errors/index.js'
import { evaluateCondition } from '../expressions/index.js'
import type { TableStore } from '../store/index.js'
import type { AttributeMap, AttributeValue, ConsumedCapacity } from '../types.js'

export interface DeleteItemInput {
	TableName: string
	Key: AttributeMap
	ConditionExpression?: string
	ExpressionAttributeNames?: Record<string, string>
	ExpressionAttributeValues?: Record<string, AttributeValue>
	ReturnValues?: 'NONE' | 'ALL_OLD'
	ReturnConsumedCapacity?: 'INDEXES' | 'TOTAL' | 'NONE'
	ReturnValuesOnConditionCheckFailure?: 'ALL_OLD' | 'NONE'
}

export interface DeleteItemOutput {
	Attributes?: AttributeMap
	ConsumedCapacity?: ConsumedCapacity
}

export function deleteItem(store: TableStore, input: DeleteItemInput): DeleteItemOutput {
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

	const oldItem = table.deleteItem(input.Key)

	const output: DeleteItemOutput = {}

	if (input.ReturnValues === 'ALL_OLD' && oldItem) {
		output.Attributes = oldItem
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
