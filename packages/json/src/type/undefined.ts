import { Serializable } from '.'

export const $undefined: Serializable<undefined, 0> = {
	is: v => typeof v === 'undefined',
	parse: _ => undefined,
	stringify: _ => 0,
}
