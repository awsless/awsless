import { baseTypes, SerializableTypes } from './type'

export const stringify = (value: unknown, types: SerializableTypes = {}) => {
	return JSON.stringify(value, createReplacer(types))
}

type Replacer = (this: any, key: string, value: any) => any

export const createReplacer = (types: SerializableTypes = {}): Replacer => {
	types = {
		...baseTypes,
		...types,
	}

	return function (key, value) {
		const original = this[key]

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
