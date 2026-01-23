import { getItem } from '@awsless/dynamodb'
import { schemaTable } from './table'

// const schema: Record<
// 	string,
// 	{
// 		function: string
// 		permissions?: string[]
// 	}
// > = {}

const schema: Record<string, string> = {}

export const getFunctionDetails = async (name: string): Promise<string | undefined> => {
	if (name in schema) {
		return schema[name]
	}

	const entry = await getItem(schemaTable, { query: name })

	if (!entry) {
		return
	}

	return (schema[name] = entry.function)
}

export const invalidate = (name: string) => {
	delete schema[name]
}
