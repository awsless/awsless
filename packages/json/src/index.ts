import { BigFloat } from '@awsless/big-float'

export type Serializable<T> = {
	is: (value: unknown) => boolean
	parse: (value: string) => T
	stringify: (value: T) => string
}

type SerializableTypes = Record<string, Serializable<any>>

const $bigfloat: Serializable<BigFloat> = {
	is: v => v instanceof BigFloat,
	parse: v => new BigFloat(v),
	stringify: v => v.toString(),
}

const $bigint: Serializable<bigint> = {
	is: v => typeof v === 'bigint',
	parse: v => BigInt(v),
	stringify: v => v.toString(),
}

const $date: Serializable<Date> = {
	is: v => v instanceof Date,
	parse: v => new Date(v),
	stringify: v => v.toISOString(),
}

const baseTypes: SerializableTypes = {
	$bigfloat,
	$bigint,
	$date,
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
