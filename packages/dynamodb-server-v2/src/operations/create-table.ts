import { ValidationException } from '../errors/index.js'
import type { TableStore } from '../store/index.js'
import type {
	AttributeDefinition,
	GlobalSecondaryIndex,
	KeySchemaElement,
	LocalSecondaryIndex,
	ProvisionedThroughput,
	StreamSpecification,
} from '../types.js'

export interface CreateTableInput {
	TableName: string
	KeySchema: KeySchemaElement[]
	AttributeDefinitions: AttributeDefinition[]
	ProvisionedThroughput?: ProvisionedThroughput
	BillingMode?: 'PROVISIONED' | 'PAY_PER_REQUEST'
	GlobalSecondaryIndexes?: GlobalSecondaryIndex[]
	LocalSecondaryIndexes?: LocalSecondaryIndex[]
	StreamSpecification?: StreamSpecification
	Tags?: Array<{ Key: string; Value: string }>
}

export interface CreateTableOutput {
	TableDescription: ReturnType<typeof validateAndCreate>
}

function validateAndCreate(store: TableStore, input: CreateTableInput) {
	if (!input.TableName) {
		throw new ValidationException('TableName is required')
	}

	if (!input.KeySchema || input.KeySchema.length === 0) {
		throw new ValidationException('KeySchema is required')
	}

	if (!input.AttributeDefinitions || input.AttributeDefinitions.length === 0) {
		throw new ValidationException('AttributeDefinitions is required')
	}

	const hashKeys = input.KeySchema.filter(k => k.KeyType === 'HASH')
	if (hashKeys.length !== 1) {
		throw new ValidationException('Exactly one hash key is required')
	}

	const rangeKeys = input.KeySchema.filter(k => k.KeyType === 'RANGE')
	if (rangeKeys.length > 1) {
		throw new ValidationException('At most one range key is allowed')
	}

	const definedAttrs = new Set(input.AttributeDefinitions.map(a => a.AttributeName))
	for (const keyElement of input.KeySchema) {
		if (!definedAttrs.has(keyElement.AttributeName)) {
			throw new ValidationException(
				`Attribute ${keyElement.AttributeName} is specified in KeySchema but not in AttributeDefinitions`
			)
		}
	}

	if (input.LocalSecondaryIndexes) {
		const tableHashKey = hashKeys[0]!.AttributeName
		for (const lsi of input.LocalSecondaryIndexes) {
			const lsiHashKey = lsi.KeySchema.find(k => k.KeyType === 'HASH')
			if (!lsiHashKey || lsiHashKey.AttributeName !== tableHashKey) {
				throw new ValidationException(
					`Local secondary index ${lsi.IndexName} must have the same hash key as the table`
				)
			}
		}
	}

	const table = store.createTable({
		TableName: input.TableName,
		KeySchema: input.KeySchema,
		AttributeDefinitions: input.AttributeDefinitions,
		ProvisionedThroughput: input.ProvisionedThroughput,
		BillingMode: input.BillingMode,
		GlobalSecondaryIndexes: input.GlobalSecondaryIndexes,
		LocalSecondaryIndexes: input.LocalSecondaryIndexes,
		StreamSpecification: input.StreamSpecification,
	})

	return table.describe()
}

export function createTable(store: TableStore, input: CreateTableInput): CreateTableOutput {
	const tableDescription = validateAndCreate(store, input)
	return { TableDescription: tableDescription }
}
