import { coerce, date as sdate, string, Struct } from 'superstruct'

export const date = (): Struct<Date, null> => {
	return coerce(sdate(), string(), value => {
		return new Date(value)
	})
}
