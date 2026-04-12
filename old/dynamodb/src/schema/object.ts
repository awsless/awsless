import { AnySchema, MarshalledOutput, Schema } from './schema'

type Properties = Record<string | symbol, AnySchema>

type KeyOf<S> = Extract<keyof S, string>

type FilterOptional<S extends Properties> = {
	[K in KeyOf<S> as S[K]['OPTIONAL'] extends true ? K : never]?: S[K]
}

type FilterRequired<S extends Properties> = {
	[K in KeyOf<S> as S[K]['OPTIONAL'] extends true ? never : K]: S[K]
}

type Optinalize<S extends Properties> = FilterOptional<S> & FilterRequired<S>

type InferInput<S extends Properties> = {
	[K in keyof Optinalize<S>]: S[K]['INPUT']
}

type InferOutput<S extends Properties> = {
	[K in keyof Optinalize<S>]: S[K]['OUTPUT']
}

type InferPaths<S extends Properties> = {
	[K in KeyOf<S>]: [K] | [K, ...S[K]['PATHS']]
}[KeyOf<S>]

type InferOptPaths<S extends Properties> = {
	[K in KeyOf<S>]: S[K]['OPTIONAL'] extends true ? [K] | [K, ...S[K]['OPT_PATHS']] : []
}[KeyOf<S>]

export const object = <S extends Properties>(props: S) =>
	new Schema<InferInput<S>, InferOutput<S>, InferPaths<S>, InferOptPaths<S>>(
		(unmarshalled: Record<string, unknown>) => {
			const marshalled: Record<string, MarshalledOutput | undefined> = {}

			for (const [key, type] of Object.entries(props)) {
				// const value = unmarshalled[key]

				// if (type.filterIn(value)) {
				// 	continue
				// }

				marshalled[key] = type.marshall(unmarshalled[key])
			}

			return { M: marshalled }
		},
		marshalled => {
			const unmarshalled: Record<string, unknown> = {}

			for (const [key, type] of Object.entries(props)) {
				// const value = marshalled.M[key]!

				// if (type.filterOut(value)) {
				// 	continue
				// }

				unmarshalled[key] = type.unmarshall(marshalled.M[key]!)
			}

			return unmarshalled as InferOutput<S>
		},
		(path, ...rest) => {
			const type = props[path]!
			return rest.length ? type.walk?.(...rest) : type
		}
	)
