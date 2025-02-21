import { Serializable } from '.'

export const $binary: Serializable<Uint8Array, string> = {
	is: v => v instanceof Uint8Array,
	parse: v => Uint8Array.from(atob(v), c => c.charCodeAt(0)),
	stringify: v => btoa(String.fromCharCode(...v)),
}
