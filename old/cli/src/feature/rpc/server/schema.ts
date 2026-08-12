import { getItem } from '@awsless/dynamodb'
import { schemaTable } from './table'

// const schema: Record<
// 	string,
// 	{
// 		function: string
// 		permissions?: string[]
// 	}
// > = {}

const dedupe = <T>(fn: (name: string) => Promise<T>) => {
	const pending = new Map<string, Promise<T>>()

	return (name: string) => {
		if (pending.has(name)) {
			return pending.get(name)
		}

		const promise = fn(name).finally(() => {
			pending.delete(name)
		})

		pending.set(name, promise)

		return promise
	}
}

type FunctionDetails = {
	name: string
	lock?: boolean
}

const schema: Record<string, FunctionDetails> = {}

export const getFunctionDetails = dedupe(async (name: string): Promise<FunctionDetails | undefined> => {
	if (name in schema) {
		return schema[name]
	}

	const entry = await getItem(schemaTable, { query: name }, { select: ['lock', 'function'] })

	if (!entry) {
		return
	}

	return (schema[name] = {
		name: entry.function,
		lock: entry.lock,
	})
})

export const invalidate = (name: string) => {
	delete schema[name]
}
