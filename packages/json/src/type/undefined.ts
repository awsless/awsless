import { Serializable } from '.'

export const $undefined: Serializable<undefined, 0> = {
	is: v => typeof v === 'undefined',
	replace: _ => undefined,
	stringify: _ => 0,
}

export const isUndefined = (value: unknown) => {
	return (
		typeof value === 'object' &&
		value !== null &&
		Object.keys(value).length === 1 &&
		'$undefined' in value &&
		value.$undefined === 0
	)
}
