import { Serializable } from '.'

export const $mockdate: Serializable<Date, string> = {
	is: v =>
		typeof v === 'object' &&
		v !== null &&
		'toISOString' in v &&
		typeof v.toISOString === 'function' &&
		'getTime' in v &&
		typeof v.getTime === 'function' &&
		'toUTCString' in v &&
		typeof v.toUTCString === 'function',
	parse: v => new Date(v),
	stringify: v => v.toISOString(),
}
