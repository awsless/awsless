import { ConditionalCheckFailedException, define, deleteItem, object, string, ttl, updateItem } from '@awsless/dynamodb'
import { getRouteEnv } from 'awsless'
import { addSeconds } from 'date-fns'
import { UUID } from 'node:crypto'

const getLockTable = () => {
	return define(getRouteEnv('LOCK_TABLE') ?? 'lock', {
		hash: 'key',
		schema: object({
			key: string(),
			ttl: ttl(),
			requestId: string(),
		}),
	})
}

const lockRequest = async (requestId: UUID, key: string) => {
	const timeout = parseInt(getRouteEnv('TIMEOUT') ?? '60', 10)
	const now = new Date()
	const ttl = addSeconds(now, timeout * 2)

	try {
		await updateItem(
			getLockTable(),
			{ key },
			{
				update: e => [
					//
					e.requestId.set(requestId),
					e.ttl.set(ttl),
				],
				when: e =>
					e.or([
						//
						e.key.notExists(),
						e.ttl.lt(now),
					]),
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
			getLockTable(),
			{ key },
			{
				when: e => [
					//
					e.key.exists(),
					e.requestId.eq(requestId),
				],
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
