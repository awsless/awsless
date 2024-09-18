import { AttributeValue } from '@aws-sdk/client-dynamodb'
import { AnyObjectSchema } from './schema/object'
import { AnySchema } from './schema/schema'

// export type AnyTable = TableDefinition<
// 	AnySchema,
// 	any,
// 	any,
// 	any
// >

export type Input<T extends AnyTable> = T['schema']['INPUT']
export type Output<T extends AnyTable> = T['schema']['OUTPUT']

export type AnyTable = Table<
	AnySchema,
	Extract<keyof AnySchema['INPUT'], string>,
	Extract<keyof AnySchema['INPUT'], string> | undefined,
	any
>

export type IndexNames<T extends AnyTable> = Extract<keyof T['indexes'], string>

export type TableIndex<Struct extends AnySchema> = {
	hash: Extract<keyof Struct['INPUT'], string>
	sort?: Extract<keyof Struct['INPUT'], string> | undefined
}

type TableIndexes<Struct extends AnySchema> = Record<string, TableIndex<Struct>>

export class Table<
	Schema extends AnyObjectSchema,
	Hash extends Extract<keyof Schema['INPUT'], string>,
	Sort extends Extract<keyof Schema['INPUT'], string> | undefined,
	Indexes extends TableIndexes<Schema> | undefined,
> {
	readonly hash: Hash
	readonly sort: Sort
	readonly schema: Schema
	readonly indexes: Indexes

	constructor(
		readonly name: string,
		opt: {
			hash: Hash
			sort?: Sort
			schema: Schema
			indexes?: Indexes
		}
	) {
		this.hash = opt.hash
		this.sort = opt.sort as Sort
		this.schema = opt.schema
		this.indexes = opt.indexes as Indexes
	}

	marshall(item: Partial<Schema['INPUT']>) {
		return this.schema.marshall(item)!.M as Record<string, AttributeValue>
	}

	unmarshall(item: any): Schema['OUTPUT'] {
		return this.schema.unmarshall({ M: item })
	}
}

export const define = <
	Struct extends AnyObjectSchema,
	Hash extends Extract<keyof Struct['INPUT'], string>,
	Sort extends Extract<keyof Struct['INPUT'], string> | undefined,
	Indexes extends TableIndexes<Struct> | undefined,
>(
	name: string,
	options: {
		hash: Hash
		sort?: Sort
		schema: Struct
		indexes?: Indexes
	}
) => new Table<Struct, Hash, Sort, Indexes>(name, options)
