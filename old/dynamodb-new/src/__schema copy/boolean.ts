import { Schema } from './schema'

export const boolean = () =>
	new Schema<'BOOL', boolean, boolean>(
		'BOOL',
		value => ({ BOOL: value }),
		value => value.BOOL
	)
