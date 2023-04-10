import { Struct, AnyStruct } from "./struct";

type Schema = Record<string, AnyStruct>

type KeyOf<S> = Extract<keyof S, string>

type FilterOptional<S extends Schema> = {
	[ K in KeyOf<S> as S[K]['optional'] extends true ? K : never ]?: S[K]
}

type FilterRequired<S extends Schema> = {
	[ K in KeyOf<S> as S[K]['optional'] extends true ? never : K ]: S[K]
}

type Optinalize<S extends Schema> = FilterOptional<S> & FilterRequired<S>

type InferInput<S extends Schema> = {
	[ K in keyof Optinalize<S> ]: S[K]['INPUT']
}

type InferOutput<S extends Schema> = {
	[ K in keyof Optinalize<S> ]: S[K]['OUTPUT']
}

type InferMarshalled<S extends Schema> = {
	[ K in keyof Optinalize<S> ]: S[K]['MARSHALLED']
}

type InferPaths<S extends Schema> = {
	[K in KeyOf<S>]: [K] | [ K, ...S[K]['PATHS'] ]
}[ KeyOf<S> ]

type InferOptPaths<S extends Schema> = {
	[K in KeyOf<S>]: S[K]['optional'] extends true ? [K] | [ K, ...S[K]['OPT_PATHS'] ] : []
}[ KeyOf<S> ]

// class ObjectStruct<
// 	T extends AttributeTypes,
// 	M, I, O,
// 	P extends Array<string | number> = [],
// 	Opt extends boolean = false
// > extends Struct<T, M, I, O, P, Opt> {
// 	walk(...path:Array<string | number>) {

// 	}
// }

export const object = <S extends Schema>(schema:S) => new Struct<
	InferMarshalled<S>,
	InferInput<S>,
	InferOutput<S>,
	InferPaths<S>,
	InferOptPaths<S>
>(
	'M',
	(unmarshalled:Record<string, unknown>) => {
		const marshalled:Record<string, unknown> = {}
		for(const [ key, type ] of Object.entries(schema)) {
			const value = unmarshalled[key]

			if(typeof value === 'undefined') {
				continue
			}

			marshalled[key] = type.marshall(value)
		}

		return marshalled as InferMarshalled<S>
	},
	(marshalled:Record<string, Record<string, unknown>>) => {
		const unmarshalled:Record<string, unknown> = {}
		for(const [ key, type ] of Object.entries(schema)) {
			const value = marshalled[key]

			if(typeof value === 'undefined') {
				continue
			}

			unmarshalled[key] = type.unmarshall(value)
		}

		return unmarshalled as InferOutput<S>
	}, (path, ...rest) => {
		return rest.length ? schema[path].walk?.(...rest) : schema[path]
	}
)
