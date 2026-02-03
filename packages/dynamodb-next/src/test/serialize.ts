import { CreateTableCommandInput } from '@aws-sdk/client-dynamodb'
import { GenericSchema } from '../schema/schema'
import { AnyTable, TableIndex } from '../table'

const filter = <L extends (unknown | undefined)[]>(list: L) => {
	return list.filter(item => !!item) as Exclude<L[number], undefined>[]
}

const unique = <L extends { AttributeName: string }[]>(list: L) => {
	const unique: Record<string, L[number]> = {}
	list.forEach(item => {
		unique[item.AttributeName] = item
	})

	return Object.values(unique) as L
}

export const serializeTable = (table: AnyTable) => {
	const indexes = Object.entries(table.indexes || {}) as [string, TableIndex<GenericSchema>][]
	const result: CreateTableCommandInput = {
		TableName: table.name,
		KeySchema: filter([
			{
				KeyType: 'HASH',
				AttributeName: table.hash,
			},
			table.sort
				? {
						KeyType: 'RANGE',
						AttributeName: table.sort,
					}
				: undefined,
		]),
		AttributeDefinitions: unique(
			filter([
				{
					AttributeName: table.hash,
					AttributeType: table.schema.walk?.(table.hash)!.type,
				},
				table.sort
					? {
							AttributeName: table.sort,
							AttributeType: table.schema.walk?.(table.sort)!.type,
						}
					: undefined,
				...indexes
					.map(([_, item]) => [
						{
							AttributeName: item.hash,
							AttributeType: table.schema.walk?.(item.hash)!.type,
						},
						item.sort
							? {
									AttributeName: item.sort,
									AttributeType: table.schema.walk?.(item.sort)!.type,
								}
							: undefined,
					])
					.flat(),
			])
		),
	}

	if (indexes.length) {
		result.GlobalSecondaryIndexes = indexes.map(([name, item]) => ({
			Projection: { ProjectionType: 'ALL' },
			IndexName: name,
			KeySchema: filter([
				{
					KeyType: 'HASH',
					AttributeName: item.hash,
				},
				item.sort
					? {
							KeyType: 'RANGE',
							AttributeName: item.sort,
						}
					: undefined,
			]),
		}))
	}

	return result
}
