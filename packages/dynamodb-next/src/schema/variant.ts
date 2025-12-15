import { VariantExpression } from '../expression/types'
import { ObjectSchema } from './object'
import { AnySchema, BaseSchema, createSchema } from './schema'

type Infer<K extends string, O extends Options<K>> = {
	[Key in keyof O]: O[Key][symbol]['Type'] & Record<K, Key>
}[keyof O]

export type VariantSchema<K extends string, O extends Options<K>> = BaseSchema<
	//
	'M',
	Infer<K, O>,
	VariantExpression<Infer<K, O>>
>

type Properties = Record<string, AnySchema>

type Options<T extends string> = Record<
	//
	string,
	ObjectSchema<any, Properties & { [K in T]?: never }>
>

export const variant = <K extends string, O extends Options<K>>(key: K, options: O): VariantSchema<K, O> =>
	createSchema({
		type: 'M',
		encode(input) {
			const type = input[key]
			if (!type) {
				throw new TypeError(`Missing variant key: ${key}`)
			}

			const variant = options[type]
			if (!variant) {
				throw new TypeError(`Unknown variant: ${type}`)
			}

			return {
				...variant.encode(input),
				[key]: {
					S: type,
				},
			}
		},
		decode(output) {
			const type = output[key]
			if (!type || !type.S) {
				throw new TypeError(`Missing variant key: ${key}`)
			}

			const variant = options[type.S]
			if (!variant) {
				throw new TypeError(`Unknown variant: ${type}`)
			}

			return {
				...variant.decode(output),
				[key]: type.S,
			}
		},
		walk() {
			throw new TypeError(`Update & condition expressions are unsupported for a variant type`)
		},
	})
