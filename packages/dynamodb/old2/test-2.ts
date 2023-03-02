
// import { Object } from 'ts-toolbelt'
// import { AttributeTypes } from '../types'

export type AttributeTypes = 'S' | 'N' | 'B' | 'BOOL' | 'L' | 'M' | 'SS' | 'NS' | 'BS'


class Struct<
	Type extends AttributeTypes,
	Marshalled,
	Input,
	Output,
	Paths extends Array<string | number> = [],
	Values extends Record<string, any> = {}
> {
	declare readonly TYPE: Type
	declare readonly MARSHALLED: Marshalled
	declare readonly INPUT: Input
	declare readonly OUTPUT: Output
	declare readonly PATHS: Paths
	declare readonly VALUES: Values

	optional?: true

	constructor(
		readonly marshall:(value:Input) => Record<Type, Marshalled>,
		readonly unmarshall:(value:Record<Type, Marshalled>) => Output,
	) {}
}

type AnyStruct = Struct<any, any, any, any, any>

type InferInput<S extends Schema> = {
	[ K in KeyOf<S> ]: S[K]['INPUT']
}

type InferOutput<S extends Schema> = {
	[ K in KeyOf<S> ]: S[K]['OUTPUT']
}

type InferMarshalled<S extends Schema> = {
	[ K in KeyOf<S> ]: S[K]['MARSHALLED']
}

type InferPaths<S extends Schema> = {
	[K in KeyOf<S>]: [K] | [ K, ...S[K]['PATHS'] ]
}[ KeyOf<S> ]

// type InferValues<S extends Schema> = InferInput<S> & {
// 	[K in KeyOf<S>]: S[K]['INPUT']
// }

// type InferValuesDeep<S extends Schema, K extends KeyOf<S>> = {
// 	[KK in KeyOf<S[K]['VALUES']>]: `${K}.${KK}`
// }[ KeyOf<S[K]['VALUES']> ]

// type InferKeys<S extends Schema> = {
// 	[ K in KeyOf<S> ]: S[K]['KEYS']
// }

type KeyOf<S> = Extract<keyof S, string>

type Value<S extends AnyStruct, P extends S['PATHS']> = S['VALUES'][P]

// type Value<S extends AnyStruct, P extends S['PATHS']> = Exclude<Object.Path<S['INPUT'], P>, undefined>

// type InferPaths<S extends Schema> = {
// 	[K in KeyOf<S>]: [K] | [ K, ...S[K]['PATHS'] ]
// }[ KeyOf<S> ]

type ArrayPaths<L extends AnyStruct> = [number] | [ number, ...L['PATHS'] ]

type Schema = Record<string, AnyStruct>

const string = () => new Struct<'S', string, string, string>(
	(value) => ({ S: value }),
	(value) => value.S
)

const number = () => new Struct<'N', string, number, number>(
	(value) => ({ N: value.toString() }),
	(value) => Number(value.N)
)

const array = <S extends AnyStruct>(struct:S) => new Struct<
	'L',
	S['MARSHALLED'][],
	S['INPUT'][],
	S['OUTPUT'][],
	ArrayPaths<S>
>(
	(value) => ({ L: value }),
	(value) => value.L
)

const object = <S extends Schema>(schema:S) => new Struct<
	'M',
	InferMarshalled<S>,
	InferInput<S>,
	InferOutput<S>,
	InferPaths<S>
	// InferValues<S>
>(
	(value) => ({ M: value }),
	(value) => value.M
)

// type UserPaths = NestedObjectKey<User>
// const user:UserPaths = [ 'layer1', 'layer2', 'id' ]

const getItem = <S extends AnyStruct, P extends S['PATHS']>(struct:S, path:P, value:Value<S, P>):Value<S, P> => {
	console.log(struct, path, value);
	return value
}

const schema = object({
	id: string(),
	list: array(object({
		key1: number(),
		key2: string()
	})),
	values: object({
		value1: string(),
		value2: string()
	})
})

type UserI = typeof schema.INPUT
type UserO = typeof schema.OUTPUT
type UserP = typeof schema.PATHS
type UserV = typeof schema.VALUES

const lol: UserV = {}


// {
// 	id: string
// 	'list': array
// 	'values.value1': string
// }

// const lol:UserI = {}

// lol.values.value1

// type UserType = Object.Path<typeof schema.INPUT, ['list', 1, 'key1']>
// type UserValue1 = Value<typeof schema, ['list', 1, 'key1']>
// type UserValue2 = Value<typeof schema, ['list']>

// const lol:UserValue2 = [{ key1:1, key2:'1'}]

const item = getItem(
	schema,
	['list', 0, 'key1'],
	'1'
)
