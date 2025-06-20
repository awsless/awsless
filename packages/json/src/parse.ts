import { baseTypes, SerializableTypes } from './type'

export const parse = (json: string, types: SerializableTypes = {}) => {
	const replacements: [any, string, unknown][] = []

	const result = JSON.parse(
		json,
		createReviver(types, (target, key, value) => {
			replacements.push([target, key, value])
		})
	)

	for (const [target, key, value] of replacements) {
		target[key] = value
	}

	return result
}

type Reviver = (this: any, key: string, value: any) => any

export const createReviver = (
	types: SerializableTypes = {},
	registerReplacement?: (target: any, key: string, value: unknown) => void
): Reviver => {
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
					const stringified = original[typeName]

					if ('parse' in type) {
						return type.parse(stringified)
					} else {
						const result = type.replace(stringified)
						registerReplacement?.(this, key, result)

						return result
					}
				}
			}
		}

		return value
	}
}
