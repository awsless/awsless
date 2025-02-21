import { Serializable } from '.'

export const $url: Serializable<URL, string> = {
	is: v => v instanceof URL,
	parse: v => new URL(v),
	stringify: v => v.toString(),
}
