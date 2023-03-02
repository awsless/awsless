import { AnyStruct } from "./structs/struct"

// export type Schema = Record<string, AnyStruct>

export type TableDefinition<
	Struct extends AnyStruct,
	Hash extends keyof Struct['INPUT'],
	Sort extends keyof Struct['INPUT'] | undefined,
	Indexes extends TableIndexes<Struct> | undefined
> = {
	name: string
	hash: Hash
	sort: Sort
	schema: Struct
	indexes: Indexes
	marshall: (item:Partial<Struct['INPUT']>) => Struct['MARSHALLED']['M']
	unmarshall: (item:Struct['MARSHALLED']['M']) => Partial<Struct['OUTPUT']>
}

export type AnyTableDefinition = TableDefinition<
	AnyStruct,
	any,
	any,
	any
>

export type IndexNames<T extends AnyTableDefinition> = Extract<keyof T['indexes'], string>

type TableIndex<Struct extends AnyStruct> = {
	hash: keyof Struct['INPUT']
	sort?: keyof Struct['INPUT']
}

type TableIndexes<Struct extends AnyStruct> = Record<string, TableIndex<Struct>>

export const define = <
	Struct extends AnyStruct,
	Hash extends keyof Struct['INPUT'],
	Sort extends keyof Struct['INPUT'] | undefined,
	Indexes extends TableIndexes<Struct> | undefined
>(
	name:string,
	options: {
		hash: Hash
		sort?: Sort
		schema: Struct
		indexes?: Indexes
	}
): TableDefinition<Struct, Hash, Sort, Indexes> => ({
	name,
	hash: options.hash,
	sort: (options.sort as Sort),
	schema: options.schema,
	indexes: (options.indexes as Indexes),
	marshall: (item) => {
		return options.schema.marshall(item).M
	},
	unmarshall: (item) => {
		return options.schema.unmarshall({ M: item })
	},
})
