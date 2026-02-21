import { baseTypes, SerializableTypes } from './type'

type Options = {
	types?: SerializableTypes
	preserveUndefinedValues?: boolean
}

export const stringify = (value: unknown, options?: Options) => {
	return JSON.stringify(value, createReplacer(options))
}

type Replacer = (this: any, key: string, value: any) => any

export const createReplacer = (options?: Options): Replacer => {
	const types = {
		...baseTypes,
		...options?.types,
	}

	return function (key, value) {
		const original = this[key]

		// ------------------------------------------------
		// To minimize the payload size of JSON we still
		// wanna strip out undefined values from objects.

		if (
			!options?.preserveUndefinedValues &&
			key &&
			typeof original === 'undefined' &&
			typeof this === 'object' &&
			!Array.isArray(this)
		) {
			return value
		}

		// ------------------------------------------------
		// Search our serializable types to find out how we
		// need to serialize our original value.

		for (const [typeName, type] of Object.entries(types)) {
			if (type.is(original)) {
				return {
					[typeName]: type.stringify(original),
				}
			}
		}

		return value
	}
}
