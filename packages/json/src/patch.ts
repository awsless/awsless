import { parse } from './parse'
import { stringify } from './stringify'
import { SerializableTypes } from './type'

export const patch = (value: unknown, types: SerializableTypes = {}): any => {
	return parse(JSON.stringify(value), types)
}

export const unpatch = (value: unknown, types: SerializableTypes = {}): any => {
	return JSON.parse(stringify(value, types))
}
