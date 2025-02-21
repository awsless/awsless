import { Serializable } from '.'

const P = +Infinity,
	N = -Infinity

export const $infinity: Serializable<typeof Infinity, 1 | 0> = {
	is: v => v === P || v === N,
	parse: v => (v === 1 ? P : N),
	stringify: v => (v > 0 ? 1 : 0),
}
