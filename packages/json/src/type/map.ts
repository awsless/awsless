import { Serializable } from '.'
import { isUndefined } from './undefined'

export const $map: Serializable<Map<unknown, unknown>, [unknown, unknown][]> = {
	is: v => v instanceof Map,
	parse: v =>
		new Map(
			v.map(pair => {
				return pair.map(i => (isUndefined(i) ? undefined : i))
			}) as [unknown, unknown][]
		),
	stringify: v => Array.from(v),
}
