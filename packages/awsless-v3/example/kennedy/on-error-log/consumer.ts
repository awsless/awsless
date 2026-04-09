import { updateItem } from '@awsless/dynamodb'
import { lambda } from '@awsless/lambda'
import { onErrorLogSchema } from '../../../src/server'
import { logTable } from './table'

export default lambda({
	schema: onErrorLogSchema,
	async handle(error) {
		await updateItem(
			logTable,
			{ hash: error.hash },
			{
				update: e => [
					e.logLevel.setIfNotExists(error.level),
					e.message.set(error.message),
					e.type.set(error.type),
					e.origin.set(error.origin),
					e.stackTrace.set(error.stackTrace),
					e.data.set(error.data),
					e.createdAt.setIfNotExists(error.date),
					e.updatedAt.set(error.date),
					e.count.incr(1),
				],
			}
		)
	},
})
