import { AnySchema, BaseSchema, createSchema } from './schema'

type Properties = Record<string, AnySchema>

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

export type AnyObjectSchema = BaseSchema<
	//
	'M',
	any,
	any,
	Array<string | number>,
	Array<string | number>,
	boolean
>

export const object = <S extends Properties>(props: S) =>
	createSchema<
		//
		'M',
		InferInput<S>,
		InferOutput<S>,
		InferPaths<S>,
		InferOptPaths<S>
	>({
		type: 'M',
		encode: (input: Record<string, unknown>) => {
			const result: Record<string, any> = {}

			for (const [key, schema] of Object.entries(props)) {
				const value = input[key]

				if (schema.filterIn(value)) {
					continue
				}

				result[key] = schema.marshall(value)
			}

			return result
		},
		decode: output => {
			const result: Record<string, any> = {}

			for (const [key, schema] of Object.entries(props)) {
				const value = output[key]

				if (schema.filterOut(value)) {
					continue
				}

				result[key] = schema.unmarshall(value!)
			}

			return result as InferOutput<S>
		},
		walk(path, ...rest) {
			const type = props[path]!

			return rest.length ? type.walk?.(...rest) : type
		},
	})
