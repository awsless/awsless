import { Serializable } from '.'

export const $regexp: Serializable<RegExp, [string, string]> = {
	is: v => v instanceof RegExp,
	parse: v => new RegExp(v[0], v[1]),
	stringify: v => [v.source, v.flags],
}
