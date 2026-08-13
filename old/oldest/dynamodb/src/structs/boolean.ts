import { Struct } from './struct'

export const boolean = () =>
	new Struct<boolean, boolean, boolean>(
		'BOOL',
		value => value,
		value => value
	)
