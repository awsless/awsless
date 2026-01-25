import { ResourceInUseException, ResourceNotFoundException } from '../errors/index.js'
import type {
	AttributeDefinition,
	GlobalSecondaryIndex,
	KeySchemaElement,
	LocalSecondaryIndex,
	ProvisionedThroughput,
	StreamSpecification,
	TimeToLiveSpecification,
} from '../types.js'
import { Table } from './table.js'

export interface CreateTableInput {
	TableName: string
	KeySchema: KeySchemaElement[]
	AttributeDefinitions: AttributeDefinition[]
	ProvisionedThroughput?: ProvisionedThroughput
	BillingMode?: 'PROVISIONED' | 'PAY_PER_REQUEST'
	GlobalSecondaryIndexes?: GlobalSecondaryIndex[]
	LocalSecondaryIndexes?: LocalSecondaryIndex[]
	StreamSpecification?: StreamSpecification
	TimeToLiveSpecification?: TimeToLiveSpecification
}

export class TableStore {
	private tables: Map<string, Table> = new Map()
	private region: string

	constructor(region: string = 'us-east-1') {
		this.region = region
	}

	createTable(input: CreateTableInput): Table {
		if (this.tables.has(input.TableName)) {
			throw new ResourceInUseException(`Table already exists: ${input.TableName}`)
		}

		const table = new Table(
			{
				tableName: input.TableName,
				keySchema: input.KeySchema,
				attributeDefinitions: input.AttributeDefinitions,
				provisionedThroughput: input.ProvisionedThroughput,
				billingMode: input.BillingMode,
				globalSecondaryIndexes: input.GlobalSecondaryIndexes,
				localSecondaryIndexes: input.LocalSecondaryIndexes,
				streamSpecification: input.StreamSpecification,
				timeToLiveSpecification: input.TimeToLiveSpecification,
			},
			this.region
		)

		this.tables.set(input.TableName, table)
		return table
	}

	getTable(tableName: string): Table {
		const table = this.tables.get(tableName)
		if (!table) {
			throw new ResourceNotFoundException(`Requested resource not found: Table: ${tableName} not found`)
		}
		return table
	}

	hasTable(tableName: string): boolean {
		return this.tables.has(tableName)
	}

	deleteTable(tableName: string): Table {
		const table = this.tables.get(tableName)
		if (!table) {
			throw new ResourceNotFoundException(`Requested resource not found: Table: ${tableName} not found`)
		}
		this.tables.delete(tableName)
		return table
	}

	listTables(
		exclusiveStartTableName?: string,
		limit?: number
	): { tableNames: string[]; lastEvaluatedTableName?: string } {
		const allNames = Array.from(this.tables.keys()).sort()

		let startIdx = 0
		if (exclusiveStartTableName) {
			startIdx = allNames.indexOf(exclusiveStartTableName)
			if (startIdx !== -1) {
				startIdx++
			} else {
				startIdx = 0
			}
		}

		const tableNames = limit ? allNames.slice(startIdx, startIdx + limit) : allNames.slice(startIdx)

		const hasMore = limit ? startIdx + tableNames.length < allNames.length : false
		const lastEvaluatedTableName = hasMore ? tableNames[tableNames.length - 1] : undefined

		return { tableNames, lastEvaluatedTableName }
	}

	clear(): void {
		this.tables.clear()
	}

	expireTtlItems(currentTimeSeconds: number): void {
		for (const table of this.tables.values()) {
			table.expireTtlItems(currentTimeSeconds)
		}
	}
}

export { Table } from './table.js'
