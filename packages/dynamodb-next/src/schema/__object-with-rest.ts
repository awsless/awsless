import { MapExpression } from '../expression/types'
import { AnySchema, BaseSchema, createSchema } from './schema'

type Properties = Record<string, AnySchema>
type KeyOf<T> = Extract<keyof T, string>
type IsOptional<T extends AnySchema> = undefined extends T[symbol]['Type'] ? true : false

type FilterOptional<T extends Properties> = { [K in KeyOf<T> as IsOptional<T[K]> extends true ? K : never]?: T[K] }
type FilterRequired<T extends Properties> = { [K in KeyOf<T> as IsOptional<T[K]> extends true ? never : K]: T[K] }

type Optinalize<T extends Properties> = FilterOptional<T> & FilterRequired<T>

type InferProps<S extends Properties, R extends AnySchema | undefined = undefined> = {
	[K in keyof Optinalize<S>]: S[K][symbol]['Type']
} & (R extends AnySchema ? { [key: string]: R[symbol]['Type'] | S[keyof S][symbol]['Type'] } : object)

export type ObjectSchema<T, P extends Properties, R extends AnySchema | undefined = undefined> = BaseSchema<
	'M',
	T,
	MapExpression<T, P, R>
>

export const objectWithRest = <P extends Properties, R extends AnySchema | undefined = undefined>(
	props: P,
	rest?: R
): ObjectSchema<InferProps<P, R>, P, R> =>
	createSchema<'M', InferProps<P, R>>({
		type: 'M',
		encode: (input: Record<string, unknown>) => {
			const result: Record<string, any> = {}

			for (const [key, value] of Object.entries(input)) {
				const schema = props[key] ?? rest

				if (!schema) {
					continue
					// throw new TypeError(`Unknown object schema key: ${key}`)
				}

				if (schema.filterIn(value)) {
					continue
				}

				result[key] = schema.marshall(value)
			}

			// for (const [key, schema] of Object.entries(props)) {
			// 	const value = input[key]

			// 	if (schema.filterIn(value)) {
			// 		continue
			// 	}

			// 	result[key] = schema.marshall(value)
			// }

			return result
		},
		decode: output => {
			const result: Record<string, any> = {}

			for (const [key, value] of Object.entries(output)) {
				const schema = props[key] ?? rest

				if (!schema) {
					continue
				}

				if (schema.filterIn(value)) {
					continue
				}

				result[key] = schema.unmarshall(value)
			}

			// for (const [key, schema] of Object.entries(props)) {
			// 	const value = output[key]

			// 	if (schema.filterOut(value)) {
			// 		continue
			// 	}

			// 	result[key] = schema.unmarshall(value!)
			// }

			return result as InferProps<P, R>
		},
		walk(path, ...rest) {
			const type = props[path]!

			return rest.length ? type.walk?.(...rest) : type
		},
	})
