import { scan } from '@awsless/dynamodb'
import { todoTable } from './table'

export default async (_event: unknown) => {
	const result = await scan(todoTable, { limit: 100 })

	return result.items.sort((a, b) => a.createdAt - b.createdAt)
}
