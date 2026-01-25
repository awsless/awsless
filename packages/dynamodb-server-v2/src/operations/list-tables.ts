import type { TableStore } from '../store/index.js'

export interface ListTablesInput {
	ExclusiveStartTableName?: string
	Limit?: number
}

export interface ListTablesOutput {
	TableNames: string[]
	LastEvaluatedTableName?: string
}

export function listTables(store: TableStore, input: ListTablesInput): ListTablesOutput {
	const result = store.listTables(input.ExclusiveStartTableName, input.Limit)

	return {
		TableNames: result.tableNames,
		LastEvaluatedTableName: result.lastEvaluatedTableName,
	}
}
