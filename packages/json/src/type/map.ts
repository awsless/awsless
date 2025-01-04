import { Serializable } from '.'

export const $map: Serializable<Map<unknown, unknown>, [unknown, unknown][]> = {
	is: v => v instanceof Map,
	parse: v => new Map(v),
	stringify: v => Array.from(v),
}
