
import { coerce, string, Struct } from 'superstruct'

export const lowercase = <T, S>(struct: Struct<T, S>): Struct<T, S> => {
	return coerce(struct, string(), (value) => value.toLowerCase())
}

export const uppercase = <T, S>(struct: Struct<T, S>): Struct<T, S> => {
	return coerce(struct, string(), (value) => value.toUpperCase())
}
