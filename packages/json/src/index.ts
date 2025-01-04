import { $bigfloat } from './type/bigfloat'
import { $bigint } from './type/bigint'
import { $date } from './type/date'
import { $map } from './type/map'
import { $set } from './type/set'

export type Serializable<I, O> = {
	is: (value: unknown) => value is I
	parse: (value: O) => I
	stringify: (value: I) => O
}

type SerializableTypes = Record<string, Serializable<any, any>>

const baseTypes: SerializableTypes = {
	$bigfloat,
	$bigint,
	$date,
	$set,
	$map,
}

export const parse = (json: string, types: SerializableTypes = {}) => {
	return JSON.parse(json, createReviver(types))
}

type Reviver = (this: any, key: string, value: any) => any
type Replacer = (this: any, key: string, value: any) => any

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

export const stringify = (value: unknown, types: SerializableTypes = {}) => {
	return JSON.stringify(value, createReplacer(types))
}

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
