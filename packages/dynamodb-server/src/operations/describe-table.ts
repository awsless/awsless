import { ValidationException } from '../errors/index.js'
import type { TableStore } from '../store/index.js'
import type { TableDescription } from '../types.js'

export interface DescribeTableInput {
	TableName: string
}

export interface DescribeTableOutput {
	Table: TableDescription
}

export function describeTable(store: TableStore, input: DescribeTableInput): DescribeTableOutput {
	if (!input.TableName) {
		throw new ValidationException('TableName is required')
	}

	const table = store.getTable(input.TableName)

	return {
		Table: table.describe(),
	}
}
