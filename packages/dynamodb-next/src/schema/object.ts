import { MapExpression } from '../expression/types'
import { AnySchema, BaseSchema, createSchema } from './schema'

type Properties = Record<string, AnySchema>
type KeyOf<S> = Extract<keyof S, string>
type IsOptional<T extends AnySchema> = undefined extends T[symbol]['Type'] ? true : false

type FilterOptional<S extends Properties> = { [K in KeyOf<S> as IsOptional<S[K]> extends true ? K : never]?: S[K] }
type FilterRequired<S extends Properties> = { [K in KeyOf<S> as IsOptional<S[K]> extends true ? never : K]: S[K] }

type Optinalize<S extends Properties> = FilterOptional<S> & FilterRequired<S>

type InferProps<S extends Properties> = { [K in keyof Optinalize<S>]: S[K][symbol]['Type'] }

export type ObjectSchema<T, P extends Properties> = BaseSchema<'M', T, MapExpression<T, P>>

export const object = <P extends Properties>(props: P): ObjectSchema<InferProps<P>, P> =>
	createSchema<'M', InferProps<P>>({
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

			return result as InferProps<P>
		},
		walk(path, ...rest) {
			const type = props[path]!

			return rest.length ? type.walk?.(...rest) : type
		},
	})
