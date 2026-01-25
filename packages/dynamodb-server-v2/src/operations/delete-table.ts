import { ValidationException } from '../errors/index.js'
import type { TableStore } from '../store/index.js'
import type { TableDescription } from '../types.js'

export interface DeleteTableInput {
	TableName: string
}

export interface DeleteTableOutput {
	TableDescription: TableDescription
}

export function deleteTable(store: TableStore, input: DeleteTableInput): DeleteTableOutput {
	if (!input.TableName) {
		throw new ValidationException('TableName is required')
	}

	const table = store.deleteTable(input.TableName)
	const description = table.describe()

	return {
		TableDescription: {
			...description,
			TableStatus: 'DELETING',
		},
	}
}
