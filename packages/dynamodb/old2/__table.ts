
// import { bigfloat, Infer, Struct, object } from '@awsless/validate'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { BigFloat, Numeric } from '@awsless/big-float'
// import { eq } from './conditions'
// import { Object } from 'ts-toolbelt'


// String	S
// Number	N
// Binary	B
// Boolean	BOOL
// Null		NULL

// List		L
// Map		M

// String Set	SS
// Number Set	NS
// Binary Set	BS


type Type<K extends string, Marshalled, Input, Output> = {
	marshall: (value: Input) => Record<K, Marshalled>
	unmarshall: (value: Record<K, Marshalled>) => Output
	optional?: true
}

type AnyType = Type<string, any, any, any>
type Schema = Record<string, AnyType>

// type HashKey<T extends TableDefinition<any>> = { [ key in T['hash'] ]: InferTypeInput<T['schema'][T['hash']]> }
// type SortKey<T extends TableDefinition<any>> = T['sort'] extends string ? { [ key in T['sort'] ]: InferTypeInput<T['schema'][T['sort']]> } : {}

// type HashKey<T extends TableDefinition<Schema, keyof Schema, keyof Schema>> = Record<T['hash'], InferTypeInput<T['schema'][T['hash']]>>
// type SortKey<T extends TableDefinition<Schema, keyof Schema, keyof Schema>> = T['sort'] extends string ? Record<T['sort'], InferTypeInput<T['schema'][T['sort']]>> : {}
// type PrimaryKey<T extends TableDefinition<Schema, keyof Schema, keyof Schema>> = HashKey<T> & SortKey<T>

type Key<S extends Schema, K extends keyof S> = Record<K, InferTypeInput<S[K]>>
type HashKey<T extends AnyTableDefinition> = Key<T['schema'], T['hash']>
type SortKey<T extends AnyTableDefinition> = T['sort'] extends string ? Key<T['schema'], T['sort']> : {}
type PrimaryKey<T extends AnyTableDefinition> = HashKey<T> & SortKey<T>

type FilterOptional<S extends Schema> = { [ K in keyof S as S[K]['optional'] extends true ? K : never ]?: S[K] }
type FilterRequired<S extends Schema> = { [ K in keyof S as S[K]['optional'] extends true ? never : K ]: S[K] }
type Optinalize<S extends Schema> = FilterOptional<S> & FilterRequired<S>

type InferTypeInput<T extends AnyType> = Parameters<T['marshall']>[0]
type InferTypeOutput<T extends AnyType> = ReturnType<T['unmarshall']>
type InferTypeMarshalled<T extends AnyType> = ReturnType<T['marshall']>

type InferSchemaInput<S extends Schema> = { [ K in keyof Optinalize<S> ]: InferTypeInput<S[K]> }
type InferSchemaOutput<S extends Schema> = { [ K in keyof Optinalize<S> ]: InferTypeOutput<S[K]> }
type InferSchemaMarshalled<S extends Schema> = { [ K in keyof Optinalize<S> ]: InferTypeMarshalled<S[K]> }

export const optional = <T extends AnyType>(type:T):T & { optional: true } => ({
	...type,
	optional: true
})

export const boolean = (): Type<'BOOL', boolean, boolean, boolean> => ({
	marshall: (value) => ({ BOOL: value }),
	unmarshall: (value) => value.BOOL
})

type BinaryValue = ArrayBuffer | Blob | Buffer | DataView | File | Int8Array | Uint8Array | Uint8ClampedArray | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array | Float64Array | BigInt64Array | BigUint64Array

export const binary = <T extends BinaryValue>(): Type<'B', T, T, T> => ({
	marshall: (value) => ({ B: value }),
	unmarshall: (value) => value.B
})

export const string = (): Type<'S', string, string, string> => ({
	marshall: (value) => ({ S: String(value) }),
	unmarshall: (value) => value.S
})

export const number = (): Type<'N', string, number, number> => ({
	marshall: (value) => ({ N: value.toString() }),
	unmarshall: (value) => Number(value.N)
})

export const bigint = (): Type<'N', string, bigint, bigint> => ({
	marshall: (value) => ({ N: value.toString() }),
	unmarshall: (value) => BigInt(value.N)
})

export const bigfloat = (): Type<'N', string, Numeric, BigFloat> => ({
	marshall: (value) => ({ N: new BigFloat(value).toString() }),
	unmarshall: (value) => new BigFloat(value.N)
})

export const binarySet = <T extends BinaryValue>(): Type<'BS', T[], Set<T>, Set<T>> => ({
	marshall: (value) => ({ BS: Array.from(value) }),
	unmarshall: (value) => new Set(value.BS)
})

export const stringSet = (): Type<'SS', string[], Set<string>, Set<string>> => ({
	marshall: (value) => ({ SS: Array.from(value) }),
	unmarshall: (value) => new Set(value.SS)
})

export const numberSet = (): Type<'NS', string[], Set<number>, Set<number>> => ({
	marshall: (value) => ({ NS: Array.from(value).map(item => item.toString()) }),
	unmarshall: (value) => new Set(value.NS.map(item => Number(item)))
})

export const bigintSet = (): Type<'NS', string[], Set<bigint>, Set<bigint>> => ({
	marshall: (value) => ({ NS: Array.from(value).map(item => item.toString()) }),
	unmarshall: (value) => new Set(value.NS.map(item => BigInt(item)))
})

export const bigfloatSet = (): Type<'NS', string[], Set<Numeric>, Set<BigFloat>> => ({
	marshall: (value) => ({ NS: Array.from(value).map(item => String(item)) }),
	unmarshall: (value) => new Set(value.NS.map(item => new BigFloat(item)))
})

export const array = <I extends AnyType>(type: I): Type<'L', InferTypeMarshalled<I>[], InferTypeInput<I>[], InferTypeInput<I>[]> => ({
	marshall(unmarshalled) {
		return {
			L: unmarshalled.map(item => type.marshall(item)) as InferTypeMarshalled<I>[]
		}
	},
	unmarshall(marshalled) {
		return marshalled.L.map(item => type.unmarshall(item))
	}
})

export const object = <S extends Schema>(schema: S): Type<'M', InferSchemaMarshalled<S>, InferSchemaInput<S>, InferSchemaOutput<S>> => ({
	marshall(unmarshalled:Record<string, unknown>) {
		const marshalled:Record<string, unknown> = {}
		for(const [ key, type ] of Object.entries(schema)) {
			const value = unmarshalled[key]

			if(type.optional && typeof value === 'undefined') {
				continue
			}

			marshalled[key] = type.marshall(value)
		}

		return {
			M: marshalled as InferSchemaMarshalled<S>
		}
	},
	unmarshall(marshalled) {
		const unmarshalled:Record<string, unknown> = {}
		for(const [ key, type ] of Object.entries(schema)) {
			const value = (marshalled.M as Record<string, Record<string, any>>)[key]

			if(type.optional && typeof value === 'undefined') {
				continue
			}

			unmarshalled[key] = type.unmarshall(value)
		}

		return unmarshalled as InferSchemaOutput<S>
	}
})

type TableDefinition<S extends Schema, Hash extends keyof S, Sort extends keyof S | undefined = undefined> = {
	name: string
	hash: Hash
	sort: Sort
	schema: S
	// type: Type<'M', InferSchemaMarshalled<S>, InferSchemaInput<S>, InferSchemaOutput<S>>
	// marshall: (unmarshalled:InferSchemaInput<S>) => InferSchemaMarshalled<S>
	// unmarshall: (marshalled:InferSchemaMarshalled<S>) => InferSchemaOutput<S>
}

type AnyTableDefinition = TableDefinition<Schema, keyof Schema, keyof Schema>

type DefineOptions<S extends Schema, Hash extends keyof S, Sort extends keyof S> = {
	hash: Hash
	sort?: Sort
	schema: S
}

export const define = <S extends Schema, Hash extends keyof S, Sort extends keyof S>(
	tableName:string,
	options:DefineOptions<S, Hash, Sort>
):TableDefinition<S, Hash, Sort> => ({
	name: tableName,
	hash: options.hash,
	sort: (options.sort as Sort), // I Don't know how to fix this any other way.
	schema: options.schema,

	// type: object(options.schema),
	// marshall(unmarshalled: InferSchemaInput<S>) {
	// 	return object(options.schema).marshall(unmarshalled).M
	// },
	// unmarshall(marshalled: InferSchemaMarshalled<S>) {
	// 	return object(options.schema).unmarshall({ M: marshalled })
	// }
})


// type User = {
// 	amount: bigint
// }

const schema = {
	id:		string(),
	sort:	number(),
	index:	optional(number()),
	amount: bigfloat(),
	list:	array(object({
		id:	string(),
	})),
	data:	binary<ArrayBuffer>(),
	set: 	numberSet(),
	attr:	object({
		id:	string(),
	})
}

const users = define('table-name', {
	hash: 'id',
	sort: 'sort',
	schema
})

// const lol = users.marshall({
// 	id: '1',
// 	sort: 1,
// 	// index: 1,
// 	amount: '1',
// 	data: new ArrayBuffer(4),
// 	set: new Set([1, 2, 3]),
// 	list: [ '1' ],
// 	attr: { id: '1' }
// })


type Users = typeof users
// const key:SortKey<TableDefinition<typeof schema, 'id', never>> = { sort: 1 }


class ConditionExpression<T extends AnyTableDefinition> {
	constructor(private def:T) {

	}
}


export interface Options {
	client?: DynamoDBClient
}

export type ProjectionOption<T extends AnyTableDefinition> = (keyof T['schema'] | NestedObjectKey<InferSchemaInput<T['schema']>>)[]

export interface GetOptions<T extends AnyTableDefinition> extends Options {
	consistentRead?: boolean
	projection?: ProjectionOption<T>
	// test?: Object.Paths<{ test: { n: number } }>
}

export const getItem = <T extends AnyTableDefinition>(table:T, key:PrimaryKey<T>, options?:GetOptions<T> = {}) => {

}

const result = getItem(users, { id: '1', sort: 1 }, {
	projection: [
		'amount',
		[ 'list', 0 ],
		[ 'list', 1, 'id' ],
		[ 'attr', 'id' ]
	]
	// condition: (path, value) => {
	// 	return eq(path('id'), value(1))
	// }
})

type NestedArrayKey<O extends unknown[]> = {
	[K in Extract<keyof O, number>]: O[K] extends unknown[]
	? [ K ] | [ K, ...NestedArrayKey<O[K]> ]
	: O[K] extends Record<string, unknown>
	? [ K ] | [ K, ...NestedObjectKey<O[K]> ]
	: [ K ]
}[ Extract<keyof O, number> ]

type NestedObjectKey<O extends Record<string, unknown>> = {
	[K in Extract<keyof O, string>]: O[K] extends unknown[]
	? [ K ] | [ K, ...NestedArrayKey<O[K]> ]
	: O[K] extends Record<string, unknown>
	? [ K ] | [ K, ...NestedObjectKey<O[K]> ]
	: [ K ]
}[ Extract<keyof O, string> ]


const LOL:NestedObjectKey<{ test: { n: {id:string}[] } }> = [ 'test', 'n', 1, 'id' ]

// keys
// getItem(users, { id: 1, sort: 1 }, {

// })


// type LIST = ['test'] | ['test', 'id']

// const T:LIST = ['test', 'id']



// getItems(users, {
// 	condition: (exp) => {
// 		exp.eq({ id: '1' }).
// 	}
// })



// type Filter<L> = { [K in keyof L]: L[K] extends true ? L[K] : never }[keyof L]
// type Filter<L> = { [K in keyof L as L[K] extends true ? K : never]: L[K] }

// let test1:Filter<{a:true, b:false}>
// test1.a
