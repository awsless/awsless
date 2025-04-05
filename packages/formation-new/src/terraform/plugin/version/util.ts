import { camelCase } from 'change-case'
import { pack, unpack } from 'msgpackr'
import { Property, RootProperty } from '../schema.ts'

export const encodeDynamicValue = (value: unknown) => {
	return {
		msgpack: pack(value),
		json: value,
	}
}

export const decodeDynamicValue = (value: { msgpack: Buffer }) => {
	return unpack(value.msgpack)
}

export const getResourceSchema = (resources: Record<string, RootProperty>, type: string) => {
	const resource = resources[type]

	if (!resource) {
		throw new Error(`Unknown resource type: ${type}`)
	}

	return resource
}

// export const prepareEmptyState = (schema: Property) => {
// 	if (schema.type !== 'object') {
// 		return {}
// 	}

// 	const empty: Record<string, null> = {}

// 	for (const name of Object.keys(schema.properties)) {
// 		empty[name] = null
// 	}

// 	return empty
// }

class IncorrectType extends TypeError {
	constructor(type: string, path: Array<string | number>) {
		super(`${path.join('.')} should be a ${type}`)
	}
}

export const formatInputState = (schema: Property, state: unknown, path: Array<string | number> = []): unknown => {
	// console.log(path, state, schema)

	if (state === null) {
		return null
	}

	// if (schema.computed && typeof schema.optional === 'undefined' && typeof schema.required === 'undefined') {
	// 	console.log(schema, state)

	// 	return undefined
	// }

	// if (schema.optional && typeof state === 'undefined') {
	// 	return null
	// }

	if (typeof state === 'undefined') {
		return null
	}

	if (schema.type === 'unknown') {
		return state
	}

	if (schema.type === 'string') {
		if (typeof state === 'string') {
			return state
		}

		console.log(schema, path, state)

		throw new IncorrectType(schema.type, path)
	}

	if (schema.type === 'number') {
		if (typeof state === 'number') {
			return state
		}

		throw new IncorrectType(schema.type, path)
	}

	if (schema.type === 'boolean') {
		if (typeof state === 'boolean') {
			return state
		}

		throw new IncorrectType(schema.type, path)
	}

	if (schema.type === 'array') {
		if (Array.isArray(state)) {
			return state.map((item, i) => formatInputState(schema.item, item, [...path, i]))
		}

		throw new IncorrectType(schema.type, path)
	}

	if (schema.type === 'record') {
		if (typeof state === 'object' && state !== null) {
			const record: Record<string, unknown> = {}

			for (const [key, value] of Object.entries(state)) {
				record[key] = formatInputState(schema.item, value, [...path, key])
			}

			return record
		}

		throw new IncorrectType(schema.type, path)
	}

	if (schema.type === 'object') {
		if (typeof state === 'object' && state !== null) {
			const object: Record<string, unknown> = {}

			for (const [key, prop] of Object.entries(schema.properties)) {
				const value = state[camelCase(key) as keyof typeof state]
				object[key] = formatInputState(prop, value, [...path, key])
			}

			return object
		}

		throw new IncorrectType(schema.type, path)
	}

	throw new Error(`Unknown schema type: ${schema.type}`)
}

export const formatOutputState = (schema: Property, state: unknown, path: Array<string | number> = []): any => {
	if (state === null) {
		return undefined
	}

	if (schema.type === 'array') {
		if (Array.isArray(state)) {
			return state.map((item, i) => formatOutputState(schema.item, item, [...path, i]))
		}

		throw new IncorrectType(schema.type, path)
	}

	if (schema.type === 'record') {
		if (typeof state === 'object' && state !== null) {
			const record: Record<string, unknown> = {}

			for (const [key, value] of Object.entries(state)) {
				record[key] = formatOutputState(schema.item, value, [...path, key])
			}

			return record
		}

		throw new IncorrectType(schema.type, path)
	}

	if (schema.type === 'object') {
		if (typeof state === 'object' && state !== null) {
			const object: Record<string, unknown> = {}

			for (const [key, prop] of Object.entries(schema.properties)) {
				const value = state[key as keyof typeof state]
				object[camelCase(key)] = formatOutputState(prop, value, [...path, key])
			}

			return object
		}

		throw new IncorrectType(schema.type, path)
	}

	return state
}
