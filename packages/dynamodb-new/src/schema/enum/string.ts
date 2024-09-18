import { Schema } from '../schema'

type StringEnum = {
	[key: string | number]: string
}

export const stringEnum = <T extends StringEnum>(_: T) =>
	new Schema<'S', T[keyof T], T[keyof T]>(
		'S',
		value => ({ S: value }),
		value => value.S as T[keyof T]
	)
