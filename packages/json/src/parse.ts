import { baseTypes, SerializableTypes } from './type'

export const parse = (json: string, types: SerializableTypes = {}) => {
	return JSON.parse(json, createReviver(types))
}

type Reviver = (this: any, key: string, value: any) => any

export const createReviver = (types: SerializableTypes = {}): Reviver => {
	types = {
		...baseTypes,
		...types,
	}

	return function (key, value) {
		const original = this[key]

		if (original !== null && typeof original === 'object') {
			const keys = Object.keys(original)

			if (keys.length === 1) {
				const typeName = keys[0]!

				if (typeName in types && types[typeName]) {
					const type = types[typeName]
					return type.parse(original[typeName])
				}
			}
		}

		return value
	}
}
