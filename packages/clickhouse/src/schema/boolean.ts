import { Schema } from './schema'

export const boolean = () =>
	new Schema<boolean, boolean, boolean>(
		value => value,
		value => value,
		'Bool'
	)
