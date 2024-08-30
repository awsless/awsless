import { AnySchema, Schema } from './schema'

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

export type AnyObjectSchema = Schema<
	//
	'M',
	any,
	any,
	Array<string | number>,
	Array<string | number>,
	boolean
>

export const object = <S extends Properties>(props: S) =>
	new Schema<
		//
		'M',
		InferInput<S>,
		InferOutput<S>,
		InferPaths<S>,
		InferOptPaths<S>
	>(
		'M',
		(unmarshalled: Record<string, unknown>) => {
			const marshalled: Record<string, any> = {}

			for (const [key, schema] of Object.entries(props)) {
				const value = unmarshalled[key]

				if (schema.filterIn(value)) {
					continue
				}

				marshalled[key] = schema.marshall(value)
			}

			return { M: marshalled }
		},
		marshalled => {
			const unmarshalled: Record<string, unknown> = {}

			for (const [key, schema] of Object.entries(props)) {
				const value = marshalled.M[key]!

				if (schema.filterOut(value)) {
					continue
				}

				unmarshalled[key] = schema.unmarshall(value)
			}

			return unmarshalled as InferOutput<S>
		},
		(path, ...rest) => {
			const type = props[path]!

			return rest.length ? type.walk?.(...rest) : type
		}
	)
