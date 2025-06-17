import { Serializable } from '.'
import { isUndefined } from './undefined'

export const $set: Serializable<Set<unknown>, unknown[]> = {
	is: v => v instanceof Set,
	parse: v => new Set(v.map(i => (isUndefined(i) ? undefined : i))),
	stringify: v => Array.from(v),
}
