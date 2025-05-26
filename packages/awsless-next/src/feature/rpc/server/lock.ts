import { ConditionalCheckFailedException, deleteItem, updateItem } from '@awsless/dynamodb'
import { addSeconds } from 'date-fns'
import { UUID } from 'node:crypto'
import { lockTable } from './table'

const lockRequest = async (requestId: UUID, key: string) => {
	const timeout = parseInt(process.env.TIMEOUT ?? '60', 10)
	const now = new Date()
	const ttl = addSeconds(now, timeout * 2)

	try {
		await updateItem(
			lockTable,
			{ key },
			{
				update: exp => exp.update('requestId').set(requestId).update('ttl').set(ttl),
				condition: exp => exp.where('key').not.exists.or.where('ttl').lt(now),
			}
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
		await deleteItem(
			lockTable,
			{ key },
			{
				condition: exp => exp.where('key').exists.and.where('requestId').eq(requestId),
			}
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
