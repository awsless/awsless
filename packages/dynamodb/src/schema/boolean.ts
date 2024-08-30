import { Schema } from './schema'

export const boolean = () =>
	new Schema<boolean, boolean>(
		value => ({ BOOL: value }),
		value => value.BOOL
	)
