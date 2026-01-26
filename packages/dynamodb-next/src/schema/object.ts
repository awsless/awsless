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
} & (R extends AnySchema ? { [key: string]: R[symbol]['Type'] | S[keyof S][symbol]['Type'] } : {})

export type ObjectSchema<T, P extends Properties, R extends AnySchema | undefined = undefined> = BaseSchema<
	'M',
	T,
	MapExpression<T, P, R>
>

export const object = <P extends Properties, R extends AnySchema | undefined = undefined>(
	props: P,
	rest?: R
): ObjectSchema<InferProps<P, R>, P, R> =>
	createSchema<'M', InferProps<P, R>>({
		type: 'M',
		encode: (input: Record<string, unknown>) => {
			const result: Record<string, any> = {}

			for (const [key, schema] of Object.entries(props)) {
				const value = input[key]

				if (typeof value === 'undefined') {
					continue
				}

				const marshalled = schema.marshall(value)
				if (typeof marshalled !== 'undefined') {
					result[key] = marshalled
				}
			}

			if (rest) {
				for (const [key, value] of Object.entries(input)) {
					if (props[key]) {
						continue
					}

					if (typeof value === 'undefined') {
						continue
					}

					const marshalled = rest.marshall(value)
					if (typeof marshalled !== 'undefined') {
						result[key] = marshalled
					}

					// result[key] = rest.marshall(value)
				}
			}

			return result
		},
		decode: output => {
			const result: Record<string, any> = {}

			for (const [key, schema] of Object.entries(props)) {
				const value = output[key]

				if (typeof value === 'undefined') {
					continue
				}

				result[key] = schema.unmarshall(value!)
			}

			if (rest) {
				for (const [key, value] of Object.entries(output)) {
					if (props[key]) {
						continue
					}

					if (typeof value === 'undefined') {
						continue
					}

					result[key] = rest.unmarshall(value)
				}
			}

			return result as InferProps<P, R>
		},
		walk(path, ...next) {
			const type = props[path] ?? rest

			return next.length ? type?.walk?.(...next) : type
		},
	})
