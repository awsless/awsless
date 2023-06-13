
import { AnyStruct, Props, Struct } from "./struct";

type Schema = Record<string, AnyStruct>

type InferInput<S extends Schema> = {
	[ K in keyof S ]: S[K]['INPUT']
}

type InferOutput<S extends Schema> = {
	[ K in keyof S ]: S[K]['OUTPUT']
}

type InferEncoded<S extends Schema> = {
	[ K in keyof S ]: S[K]['ENCODED']
}

export const object = <S extends Schema>(schema:S) => {
	const properties:Record<string, Props> = {}

	for(const key in schema) {
		properties[key] = schema[key].props
	}

	return new Struct<InferEncoded<S>, InferInput<S>, InferOutput<S>>(
		(input) => {
			const encoded:Record<string, unknown> = {}
			for(const key in schema) {
				if(typeof input[key] === 'undefined') {
					throw new TypeError(`No '${key}' property present on object: ${JSON.stringify(input)}`)
				}

				encoded[key] = schema[key].encode(input[key])
			}

			return encoded as InferEncoded<S>
		},
		(encoded) => {
			const output:Record<string, unknown> = {}
			for(const key in schema) {
				if(typeof encoded[key] === 'undefined') {
					throw new TypeError(`No '${key}' property present on object: ${JSON.stringify(encoded)}`)
				}

				output[key] = schema[key].decode(encoded[key])
			}

			return output as InferOutput<S>
		},
		{ properties }
	)
}
