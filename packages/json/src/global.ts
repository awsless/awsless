import { baseTypes, SerializableTypes } from './type'

export const setGlobalTypes = (types: SerializableTypes) => {
	// Types match in registration order, so custom types go first.
	const base = { ...baseTypes }

	for (const key of Object.keys(baseTypes)) {
		delete baseTypes[key]
	}

	Object.assign(baseTypes, types)

	for (const [key, type] of Object.entries(base)) {
		if (!(key in types)) {
			baseTypes[key] = type
		}
	}
}
