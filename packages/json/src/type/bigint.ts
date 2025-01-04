import { Serializable } from '.'

export const $bigint: Serializable<bigint, string> = {
	is: v => typeof v === 'bigint',
	parse: v => BigInt(v),
	stringify: v => v.toString(),
}
