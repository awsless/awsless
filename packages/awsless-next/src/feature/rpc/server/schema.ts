import { getItem } from '@awsless/dynamodb'
import { schemaTable } from './table'

const schema: Record<
	string,
	{
		function: string
		permissions?: string[]
	}
> = {}

export const getFunctionDetails = async (name: string) => {
	if (name in schema) {
		return schema[name]
	}

	const entry = await getItem(schemaTable, { query: name })

	if (!entry) {
		return
	}

	return (schema[name] = {
		function: entry.function,
		permissions: entry.permissions,
	})
}

export const invalidate = (name: string) => {
	delete schema[name]
}
