
import { coerce, string, Struct } from 'superstruct'

export const json = <T, S>(struct: Struct<T, S>): Struct<T, S> => {
	return coerce(struct, string(), (value) => {
		try {
			return JSON.parse(value)
		} catch(error) {
			return value
		}
	})
}
