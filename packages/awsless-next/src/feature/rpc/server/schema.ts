import { getItem } from '@awsless/dynamodb'
import { schemaTable } from './table'

const schema: Record<string, string> = {}

export const getFunctionName = async (name: string) => {
	if (name in schema) {
		return schema[name]
	}

	const entry = await getItem(schemaTable, { query: name })

	if (!entry) {
		return
	}

	schema[name] = entry.function

	return entry.function
}

export const invalidate = (name: string) => {
	delete schema[name]
}
