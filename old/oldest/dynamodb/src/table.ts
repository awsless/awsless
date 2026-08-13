import { AnyStruct } from "./structs/struct"

// export type AnyTableDefinition = TableDefinition<
// 	AnyStruct,
// 	any,
// 	any,
// 	any
// >

export type InferInput<T extends AnyTableDefinition> = T['schema']['INPUT']
export type InferOutput<T extends AnyTableDefinition> = T['schema']['OUTPUT']

export type AnyTableDefinition = TableDefinition<
	AnyStruct,
	Extract<keyof AnyStruct['INPUT'], string>,
	Extract<keyof AnyStruct['INPUT'], string> | undefined,
	any
>

export type IndexNames<T extends AnyTableDefinition> = Extract<keyof T['indexes'], string>

export type TableIndex<Struct extends AnyStruct> = {
	hash: Extract<keyof Struct['INPUT'], string>
	sort?: Extract<keyof Struct['INPUT'], string> | undefined
}

type TableIndexes<Struct extends AnyStruct> = Record<string, TableIndex<Struct>>

export class TableDefinition<
	Struct extends AnyStruct,
	Hash extends Extract<keyof Struct['INPUT'], string>,
	Sort extends Extract<keyof Struct['INPUT'], string> | undefined,
	Indexes extends TableIndexes<Struct> | undefined
> {
	readonly hash: Hash
	readonly sort: Sort
	readonly schema: Struct
	readonly indexes: Indexes

	constructor(readonly name:string, opt: {
		hash: Hash,
		sort?: Sort,
		schema: Struct
		indexes?: Indexes
	}) {
		this.hash = opt.hash
		this.sort = opt.sort as Sort
		this.schema = opt.schema
		this.indexes = opt.indexes as Indexes
	}

	marshall(item:Partial<Struct['INPUT']>): Struct['MARSHALLED'][string] {
		return this.schema._marshall(item)
	}

	unmarshall(item:Struct['MARSHALLED'][string]): Struct['OUTPUT'] {
		return this.schema._unmarshall(item)
	}
}

export const define = <
	Struct extends AnyStruct,
	Hash extends Extract<keyof Struct['INPUT'], string>,
	Sort extends Extract<keyof Struct['INPUT'], string> | undefined,
	Indexes extends TableIndexes<Struct> | undefined
>(
	name:string,
	options: {
		hash: Hash
		sort?: Sort
		schema: Struct
		indexes?: Indexes
	}
) => new TableDefinition<Struct, Hash, Sort, Indexes>(name, options)
