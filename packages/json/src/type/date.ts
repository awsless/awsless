import { Serializable } from '.'

export const $date: Serializable<Date, string> = {
	is: v => v instanceof Date,
	parse: v => new Date(v),
	stringify: v => v.toISOString(),
}
