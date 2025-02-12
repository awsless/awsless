import { AnySchema, Mapping, Schema } from './schema'

type Entries = Record<string, AnySchema>

type InferInput<S extends Entries> = {
	[K in keyof S]: S[K]['INPUT']
}

type InferOutput<S extends Entries> = {
	[K in keyof S]: S[K]['OUTPUT']
}

type InferEncoded<S extends Entries> = {
	[K in keyof S]: S[K]['ENCODED']
}

export const object = <T extends Entries>(entries: T) => {
	const properties: Record<string, Mapping> = {}

	for (const key in entries) {
		properties[key] = entries[key]!.mapping
	}

	return new Schema<InferEncoded<T>, InferInput<T>, InferOutput<T>>(
		input => {
			const encoded: Record<string, unknown> = {}
			for (const key in input) {
				const field = entries[key]
				if (typeof field === 'undefined') {
					throw new TypeError(`No '${key}' property present on schema.`)
				}

				encoded[key] = field.encode(input[key])
			}

			return encoded as InferEncoded<T>
		},
		encoded => {
			const output: Record<string, unknown> = {}
			for (const key in encoded) {
				const field = entries[key]
				if (typeof field === 'undefined') {
					throw new TypeError(`No '${key}' property present on schema.`)
				}

				output[key] = field.decode(encoded[key])
			}

			return output as InferOutput<T>
		},
		{ properties }
	)
}
