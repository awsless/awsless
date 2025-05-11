import {
	ConditionalCheckFailedException,
	DeleteItemCommand,
	DynamoDBClient,
	UpdateItemCommand,
} from '@aws-sdk/client-dynamodb'
import { UUID } from 'node:crypto'
import { LOCK_TABLE } from './config'

const client = new DynamoDBClient({})

const lockRequest = async (requestId: UUID, key: string) => {
	const now = Date.now()
	const ttl = now + 60 * 3 * 2

	try {
		await client.send(
			new UpdateItemCommand({
				TableName: LOCK_TABLE,
				Key: {
					key: {
						S: key,
					},
				},
				UpdateExpression: 'SET #requestId = :requestId, #ttl = :ttl',
				ConditionExpression: 'attribute_not_exists(#key) OR #ttl < :now',
				ExpressionAttributeNames: {
					'#key': 'key',
					'#ttl': 'ttl',
					'#requestId': 'requestId',
				},
				ExpressionAttributeValues: {
					':requestId': { S: requestId },
					':ttl': { N: ttl.toString() },
					':now': { N: now.toString() },
				},
			})
		)
	} catch (error) {
		if (error instanceof ConditionalCheckFailedException) {
			return false
		}

		throw error
	}

	return true
}

const unlockRequest = async (requestId: UUID, key: string) => {
	try {
		await client.send(
			new DeleteItemCommand({
				TableName: LOCK_TABLE,
				Key: {
					key: {
						S: key,
					},
				},
				ConditionExpression: 'attribute_exists(#key) AND #requestId = :requestId',
				ExpressionAttributeNames: {
					'#key': 'key',
					'#requestId': 'requestId',
				},
				ExpressionAttributeValues: {
					':requestId': { S: requestId },
				},
			})
		)
	} catch (error) {
		if (error instanceof ConditionalCheckFailedException) {
			console.error('Failed to unlock request')

			return
		}

		throw error
	}
}

export const lock = (requestId: UUID, key: string) => {
	return lockRequest(requestId, key)
}

export const unlock = async (requestId: UUID, key: string) => {
	return unlockRequest(requestId, key)
}
