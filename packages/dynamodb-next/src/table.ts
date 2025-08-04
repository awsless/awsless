import { AttributeValue } from '@aws-sdk/client-dynamodb'
import { BaseSchema } from './schema/schema'

type AnyMapSchema = BaseSchema<'M'>

export type Infer<T extends AnyTable> = T['schema'][symbol]['Type']

export type AnyTable<T extends AnyMapSchema = AnyMapSchema> = Table<T, any, any, any>

export type IndexNames<T extends AnyTable> = Extract<keyof T['indexes'], string>

export type TableIndex<Schema extends AnyMapSchema> = {
	hash: Extract<keyof Schema[symbol]['Type'], string>
	sort?: Extract<keyof Schema[symbol]['Type'], string> | undefined
}

type TableIndexes<Schema extends AnyMapSchema> = Record<string, TableIndex<Schema>>

export class Table<
	Schema extends AnyMapSchema,
	Hash extends Extract<keyof Schema[symbol]['Type'], string>,
	Sort extends Extract<keyof Schema[symbol]['Type'], string> | undefined,
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

	walk(...path: Array<string | number>) {
		if (path.length === 0) {
			return this.schema
		}

		const result = this.schema.walk?.(...path)

		if (!result) {
			throw new Error(`Invalid path to walk: ${path}`)
		}

		return result
	}

	marshall(item: Partial<Schema[symbol]['Type']>) {
		return this.schema.marshall(item)!.M as Record<string, AttributeValue>
	}

	unmarshall(item: any): Schema[symbol]['Type'] {
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
// > = string & {
// 	readonly _TABLE: TableDef<Hash, HashType, Sort, SortType>
// }

// type BrandedTableName<
// 	Hash extends string | number | symbol,
// 	HashType extends string | number | NativeAttributeBinary,
// 	Sort extends string | number | symbol = never,
// 	SortType extends string | number | NativeAttributeBinary = never,
// 	// TTL extends keyof Schema['INPUT'] | undefined,
// > = string & {
// 	TABLE?: TableDef<Hash, HashType, Sort, SortType>
// }

// type HasSortKey<T> = T extends BrandedTableName<any, any, infer Sort, any> ? (Sort extends never ? false : true) : false

// type ExtractSortKey<T> =
// 	T extends BrandedTableName<any, any, infer Sort, any> ? (Sort extends never ? undefined : Sort) : undefined

// type IsBranded<T> = T extends BrandedTableName<any, any, any, any> ? true : false

// type IsBranded<T> = T extends { readonly _TABLE: any } ? true : false

// type Options<Name, Schema, Hash, Sort, Indexes> = {
// 	hash: Hash
// 	schema: Schema
// 	indexes?: Indexes
// } & (IsBranded<Name> extends true
// 	? //
// 		HasSortKey<Name> extends true
// 		? { sort: Sort }
// 		: {}
// 	: { sort?: Sort })

// type Options<Name, Schema, Hash, Sort, Indexes> =
// 	HasSortKey<Name> extends true
// 		? { hash: Hash; sort: ExtractSortKey<Name>; schema: Schema; indexes?: Indexes }
// 		: { hash: Hash; schema: Schema; indexes?: Indexes }

export const define = <
	// Name extends
	// 	| string
	// 	| BrandedTableName<
	// 			Hash,
	// 			Schema['INPUT'][Hash],
	// 			Sort,
	// 			Sort extends keyof Schema['INPUT'] ? Schema['INPUT'][Sort] : never
	// 	  >,
	// Schema extends BaseSchema<
	// 	//
	// 	'M',
	// 	IsBranded<Name> extends true ? {
	// 		[K of Name['_TABLE']['hash']]: Name['_TABLE']['hashType'] : any
	// 	} : any,
	// 	any,
	// 	Array<string | number>,
	// 	Array<string | number>,
	// 	boolean
	// >,
	Schema extends AnyMapSchema,
	Hash extends Extract<keyof Schema[symbol]['Type'], string>,
	Sort extends Extract<keyof Schema[symbol]['Type'], string> | undefined,
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
// 	hash: 'key',

// 	// sort: undefined,
// 	sort: 'sort',
// 	// sort: 'key',
// 	// sort: 'key',
// 	schema: object({
// 		key: string(),
// 		// sort: number(),
// 		sort: string(),
// 	}),
// })

// define('lol', {
// 	hash: 'key',
// 	sort: 'key',
// 	// lol: true,
// 	schema: object({
// 		key: string(),
// 		sort: string(),
// 	}),
// })

// define('lol', {
// 	hash: 'key',
// 	// sort: 'key',
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

// const table = Table.stack.name.define<['id', 'S'] | ['num', 'N'] | ['sortkey', 'N']>({
// 	id: string(),
// })

// TABLES = {
// 	stack_name: {
// 		h: 'id',
// 		s: 'num',
// 		i: {
// 			list: {
// 				h: 'id',
// 				s: 'num',
// 			},
// 		},
// 	},
// }

// define(Table.stack.name, {

// })

// type Name = 'table-name' & {
// 	hashKey: 'sort'
// 	hashType: 'L'
// 	sortKey: 'sort'
// 	sortType: 'S'
// }
