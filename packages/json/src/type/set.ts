import { Serializable } from '..'

export const $set: Serializable<Set<unknown>, unknown[]> = {
	is: v => v instanceof Set,
	parse: v => new Set(v),
	stringify: v => Array.from(v),
}
