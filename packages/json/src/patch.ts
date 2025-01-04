import { parse } from './parse'
import { stringify } from './stringify'
import { SerializableTypes } from './type'

export const patch = <T>(value: T, types: SerializableTypes = {}): T => {
	return parse(stringify(value, types), types)
}
