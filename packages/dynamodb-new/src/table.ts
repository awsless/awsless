import { AttributeValue } from '@aws-sdk/client-dynamodb'
// import { NativeAttributeBinary } from '@aws-sdk/util-dynamodb'
// import { number } from './schema/number'
import { AnyObjectSchema } from './schema/object'
import { AnySchema } from './schema/schema'
// import { string } from './schema/string'

// export type AnyTable = TableDefinition<
// 	AnySchema,
// 	any,
// 	any,
// 	any
// >

export type Input<T extends AnyTable> = T['schema']['INPUT']
export type Output<T extends AnyTable> = T['schema']['OUTPUT']

export type AnyTable = Table<AnySchema, keyof AnySchema['INPUT'], keyof AnySchema['INPUT'] | undefined, any>

export type IndexNames<T extends AnyTable> = keyof T['indexes']

export type TableIndex<Struct extends AnySchema> = {
	hash: keyof Struct['INPUT']
	sort?: keyof Struct['INPUT'] | undefined
}

type TableIndexes<Struct extends AnySchema> = Record<string, TableIndex<Struct>>

export class Table<
	Schema extends AnyObjectSchema,
	Hash extends keyof Schema['INPUT'],
	Sort extends keyof Schema['INPUT'] | undefined,
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

// type TableDef<
// 	Hash extends string | number | symbol,
// 	HashType extends string | number | NativeAttributeBinary,
// 	Sort extends string | number | symbol | undefined,
// 	SortType extends string | number | NativeAttributeBinary | undefined,
// 	// TTL extends keyof Schema['INPUT'] | undefined,
// > = {
// 	hash: Hash
// 	hashType: HashType
// 	sort: Sort
// 	sortType: SortType
// 	// ttlKey?: TTL
// 	// indexes?: Record<
// 	// 	string,
// 	// 	{
// 	// 		hashKey: string
// 	// 		hashType: 'S' | 'N' | 'B'
// 	// 		sortKey?: string
// 	// 		sortType?: 'S' | 'N' | 'B'
// 	// 	}
// 	// >
// }

// type BrandedTableName<
// 	Hash extends string | number | symbol,
// 	HashType extends string | number | NativeAttributeBinary,
// 	Sort extends string | number | symbol | undefined = undefined,
// 	SortType extends string | number | NativeAttributeBinary | undefined = undefined,
// 	// TTL extends keyof Schema['INPUT'] | undefined,
// > = string & {
// 	TABLE?: TableDef<Hash, HashType, Sort, SortType>
// }

// type Options<
// 	Name extends BrandedTableName<
// 		Hash,
// 		Schema['INPUT'][Hash],
// 		Sort,
// 		Sort extends keyof Schema['INPUT'] ? Schema['INPUT'][Sort] : undefined
// 	>,
// 	Schema extends AnyObjectSchema,
// 	Hash extends keyof Schema['INPUT'],
// 	Sort extends keyof Schema['INPUT'] | undefined,
// 	Indexes extends TableIndexes<Schema> | undefined,
// > = {
// 	hash: Hash
// 	schema: Schema
// 	indexes?: Indexes
// } & (Name['TABLE'] extends TableDef<
// 	Hash,
// 	Schema['INPUT'][Hash],
// 	Sort,
// 	Sort extends keyof Schema['INPUT'] ? Schema['INPUT'][Sort] : undefined
// >
// 	? Name['TABLE']['sort'] extends string
// 		? { sort: Sort }
// 		: {}
// 	: { sort?: Sort })

export const define = <
	// Name extends BrandedTableName<
	// 	Hash,
	// 	Schema['INPUT'][Hash],
	// 	Sort,
	// 	Sort extends keyof Schema['INPUT'] ? Schema['INPUT'][Sort] : undefined
	// >,
	Schema extends AnyObjectSchema,
	Hash extends keyof Schema['INPUT'],
	Sort extends keyof Schema['INPUT'] | undefined,
	Indexes extends TableIndexes<Schema> | undefined,
>(
	// name: Name,
	name: string,
	// options: Options<Name, Schema, Hash, Sort, Indexes>
	options: {
		hash: Hash
		sort?: Sort
		schema: Schema
		indexes?: Indexes
	}
) => new Table<Schema, Hash, Sort, Indexes>(name, options)

// type Name = 'lol' & {
// 	hashKey: 'sort'
// 	hashType: 'L'
// 	sortKey: 'sort'
// 	sortType: 'S'
// }

// type Name = BrandedTableName<'key', string, 'sort', number>

// type Name = BrandedTableName<'key', string>

// define('lol' as Name, {
// 	// name: 'lol' as Name,
// 	// name: 'lol',
// 	// hash: 'sort',
// 	// sort: 'key',
// 	hash: 'key',
// 	// sort: 'sort',
// 	// sort: 'key',
// 	schema: object({
// 		key: string(),
// 		sort: number(),
// 	}),
// })

// define('lol', {
// 	hash: 'key',
// 	sort: 'sort',
// 	schema: object({
// 		key: string(),
// 		sort: string(),
// 	}),
// })

// type DefineTable = <
// 	Schema extends AnyObjectSchema,
// 	Hash extends Extract<keyof Struct['INPUT'], string>,
// 	Sort extends Extract<keyof Struct['INPUT'], string> | undefined,
// 	Indexes extends TableIndexes<Struct> | undefined,
// >(options: {}) => {}

// const defineTable: () => DefineTable<AnyObjectSchema, 'key', undefined, undefined> = () => new Table()

// Table<
// Schema<'M', {key: string}>, {key: string}, Array<string | number>, Array<string | number>, boolean>,'key', undefined, undefined> {

// export type AnyObjectSchema = Schema<
// 	//
// 	'M',
// 	any,
// 	any,
// 	Array<string | number>,
// 	Array<string | number>,
// 	boolean
// >
