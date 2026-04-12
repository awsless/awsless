import {
	ConditionalCheckFailedException,
	TransactionCanceledException,
	ValidationException,
	type CancellationReason,
} from '../errors/index.js'
import { applyUpdateExpression, evaluateCondition } from '../expressions/index.js'
import { extractKey, serializeKey } from '../store/item.js'
import type { TableStore } from '../store/index.js'
import type { AttributeMap, AttributeValue, ConsumedCapacity } from '../types.js'

interface ConditionCheck {
	TableName: string
	Key: AttributeMap
	ConditionExpression: string
	ExpressionAttributeNames?: Record<string, string>
	ExpressionAttributeValues?: Record<string, AttributeValue>
	ReturnValuesOnConditionCheckFailure?: 'ALL_OLD' | 'NONE'
}

interface Put {
	TableName: string
	Item: AttributeMap
	ConditionExpression?: string
	ExpressionAttributeNames?: Record<string, string>
	ExpressionAttributeValues?: Record<string, AttributeValue>
	ReturnValuesOnConditionCheckFailure?: 'ALL_OLD' | 'NONE'
}

interface Delete {
	TableName: string
	Key: AttributeMap
	ConditionExpression?: string
	ExpressionAttributeNames?: Record<string, string>
	ExpressionAttributeValues?: Record<string, AttributeValue>
	ReturnValuesOnConditionCheckFailure?: 'ALL_OLD' | 'NONE'
}

interface Update {
	TableName: string
	Key: AttributeMap
	UpdateExpression: string
	ConditionExpression?: string
	ExpressionAttributeNames?: Record<string, string>
	ExpressionAttributeValues?: Record<string, AttributeValue>
	ReturnValuesOnConditionCheckFailure?: 'ALL_OLD' | 'NONE'
}

export interface TransactWriteItemsInput {
	TransactItems: Array<
		| { ConditionCheck: ConditionCheck }
		| { Put: Put }
		| { Delete: Delete }
		| { Update: Update }
	>
	ClientRequestToken?: string
	ReturnConsumedCapacity?: 'INDEXES' | 'TOTAL' | 'NONE'
	ReturnItemCollectionMetrics?: 'SIZE' | 'NONE'
}

export interface TransactWriteItemsOutput {
	ConsumedCapacity?: ConsumedCapacity[]
	ItemCollectionMetrics?: Record<
		string,
		Array<{
			ItemCollectionKey: AttributeMap
			SizeEstimateRangeGB: [number, number]
		}>
	>
}

const MAX_TRANSACT_ITEMS = 100

const idempotencyTokens = new Map<string, { timestamp: number; result: TransactWriteItemsOutput }>()
const IDEMPOTENCY_WINDOW_MS = 10 * 60 * 1000

export function transactWriteItems(store: TableStore, input: TransactWriteItemsInput): TransactWriteItemsOutput {
	if (!input.TransactItems) {
		throw new ValidationException('TransactItems is required')
	}

	if (input.TransactItems.length > MAX_TRANSACT_ITEMS) {
		throw new ValidationException(`Too many items in the TransactWriteItems call. Max is ${MAX_TRANSACT_ITEMS}`)
	}

	if (input.ClientRequestToken) {
		const cached = idempotencyTokens.get(input.ClientRequestToken)
		if (cached) {
			if (Date.now() - cached.timestamp < IDEMPOTENCY_WINDOW_MS) {
				return cached.result
			}
			idempotencyTokens.delete(input.ClientRequestToken)
		}
	}

	const itemKeys = new Set<string>()
	for (const transactItem of input.TransactItems) {
		let tableName: string
		let key: AttributeMap

		if ('ConditionCheck' in transactItem) {
			tableName = transactItem.ConditionCheck.TableName
			key = transactItem.ConditionCheck.Key
		} else if ('Put' in transactItem) {
			tableName = transactItem.Put.TableName
			const table = store.getTable(tableName)
			key = extractKey(transactItem.Put.Item, table.keySchema)
		} else if ('Delete' in transactItem) {
			tableName = transactItem.Delete.TableName
			key = transactItem.Delete.Key
		} else if ('Update' in transactItem) {
			tableName = transactItem.Update.TableName
			key = transactItem.Update.Key
		} else {
			throw new ValidationException('Invalid transaction item')
		}

		const table = store.getTable(tableName)
		const keyString = `${tableName}#${serializeKey(key, table.keySchema)}`

		if (itemKeys.has(keyString)) {
			throw new ValidationException('Transaction request cannot include multiple operations on one item')
		}
		itemKeys.add(keyString)
	}

	const cancellationReasons: CancellationReason[] = []
	let hasCancellation = false

	for (const transactItem of input.TransactItems) {
		const reason = validateTransactionItem(store, transactItem)
		cancellationReasons.push(reason)
		if (reason.Code !== 'None') {
			hasCancellation = true
		}
	}

	if (hasCancellation) {
		throw new TransactionCanceledException('Transaction cancelled, please refer cancance reasons for specific reasons', cancellationReasons)
	}

	const consumedCapacity: Map<string, number> = new Map()

	for (const transactItem of input.TransactItems) {
		executeTransactionItem(store, transactItem, consumedCapacity)
	}

	const output: TransactWriteItemsOutput = {}

	if (input.ReturnConsumedCapacity && input.ReturnConsumedCapacity !== 'NONE') {
		output.ConsumedCapacity = Array.from(consumedCapacity.entries()).map(([tableName, units]) => ({
			TableName: tableName,
			CapacityUnits: units,
			WriteCapacityUnits: units,
		}))
	}

	if (input.ClientRequestToken) {
		idempotencyTokens.set(input.ClientRequestToken, {
			timestamp: Date.now(),
			result: output,
		})
	}

	return output
}

function validateTransactionItem(
	store: TableStore,
	transactItem:
		| { ConditionCheck: ConditionCheck }
		| { Put: Put }
		| { Delete: Delete }
		| { Update: Update }
): CancellationReason {
	try {
		if ('ConditionCheck' in transactItem) {
			const { ConditionCheck: check } = transactItem
			const table = store.getTable(check.TableName)
			const existingItem = table.getItem(check.Key)

			const conditionMet = evaluateCondition(check.ConditionExpression, existingItem || {}, {
				expressionAttributeNames: check.ExpressionAttributeNames,
				expressionAttributeValues: check.ExpressionAttributeValues,
			})

			if (!conditionMet) {
				return {
					Code: 'ConditionalCheckFailed',
					Message: 'The conditional request failed',
					Item: check.ReturnValuesOnConditionCheckFailure === 'ALL_OLD' ? existingItem : undefined,
				}
			}
		} else if ('Put' in transactItem) {
			const { Put: put } = transactItem

			if (put.ConditionExpression) {
				const table = store.getTable(put.TableName)
				const key = extractKey(put.Item, table.keySchema)
				const existingItem = table.getItem(key)

				const conditionMet = evaluateCondition(put.ConditionExpression, existingItem || {}, {
					expressionAttributeNames: put.ExpressionAttributeNames,
					expressionAttributeValues: put.ExpressionAttributeValues,
				})

				if (!conditionMet) {
					return {
						Code: 'ConditionalCheckFailed',
						Message: 'The conditional request failed',
						Item: put.ReturnValuesOnConditionCheckFailure === 'ALL_OLD' ? existingItem : undefined,
					}
				}
			}
		} else if ('Delete' in transactItem) {
			const { Delete: del } = transactItem

			if (del.ConditionExpression) {
				const table = store.getTable(del.TableName)
				const existingItem = table.getItem(del.Key)

				const conditionMet = evaluateCondition(del.ConditionExpression, existingItem || {}, {
					expressionAttributeNames: del.ExpressionAttributeNames,
					expressionAttributeValues: del.ExpressionAttributeValues,
				})

				if (!conditionMet) {
					return {
						Code: 'ConditionalCheckFailed',
						Message: 'The conditional request failed',
						Item: del.ReturnValuesOnConditionCheckFailure === 'ALL_OLD' ? existingItem : undefined,
					}
				}
			}
		} else if ('Update' in transactItem) {
			const { Update: update } = transactItem

			if (update.ConditionExpression) {
				const table = store.getTable(update.TableName)
				const existingItem = table.getItem(update.Key)

				const conditionMet = evaluateCondition(update.ConditionExpression, existingItem || {}, {
					expressionAttributeNames: update.ExpressionAttributeNames,
					expressionAttributeValues: update.ExpressionAttributeValues,
				})

				if (!conditionMet) {
					return {
						Code: 'ConditionalCheckFailed',
						Message: 'The conditional request failed',
						Item: update.ReturnValuesOnConditionCheckFailure === 'ALL_OLD' ? existingItem : undefined,
					}
				}
			}
		}

		return { Code: 'None', Message: null }
	} catch (error) {
		if (error instanceof ConditionalCheckFailedException) {
			return {
				Code: 'ConditionalCheckFailed',
				Message: error.message,
				Item: error.Item as AttributeMap | undefined,
			}
		}
		return {
			Code: 'ValidationError',
			Message: error instanceof Error ? error.message : 'Unknown error',
		}
	}
}

function executeTransactionItem(
	store: TableStore,
	transactItem:
		| { ConditionCheck: ConditionCheck }
		| { Put: Put }
		| { Delete: Delete }
		| { Update: Update },
	consumedCapacity: Map<string, number>
): void {
	if ('ConditionCheck' in transactItem) {
		const tableName = transactItem.ConditionCheck.TableName
		const current = consumedCapacity.get(tableName) || 0
		consumedCapacity.set(tableName, current + 2)
		return
	}

	if ('Put' in transactItem) {
		const { Put: put } = transactItem
		const table = store.getTable(put.TableName)
		table.putItem(put.Item)

		const current = consumedCapacity.get(put.TableName) || 0
		consumedCapacity.set(put.TableName, current + 2)
		return
	}

	if ('Delete' in transactItem) {
		const { Delete: del } = transactItem
		const table = store.getTable(del.TableName)
		table.deleteItem(del.Key)

		const current = consumedCapacity.get(del.TableName) || 0
		consumedCapacity.set(del.TableName, current + 2)
		return
	}

	if ('Update' in transactItem) {
		const { Update: update } = transactItem
		const table = store.getTable(update.TableName)

		const existingItem = table.getItem(update.Key)
		let item: AttributeMap = existingItem ? { ...existingItem } : { ...update.Key }

		item = applyUpdateExpression(item, update.UpdateExpression, {
			expressionAttributeNames: update.ExpressionAttributeNames,
			expressionAttributeValues: update.ExpressionAttributeValues,
		})

		for (const [key, value] of Object.entries(update.Key)) {
			item[key] = value
		}

		table.updateItem(update.Key, item)

		const current = consumedCapacity.get(update.TableName) || 0
		consumedCapacity.set(update.TableName, current + 2)
	}
}
