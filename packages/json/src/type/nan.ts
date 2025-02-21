import { Serializable } from '.'

export const $nan: Serializable<typeof NaN, 0> = {
	is: v => typeof v === 'number' && isNaN(v),
	parse: _ => NaN,
	stringify: _ => 0,
}
