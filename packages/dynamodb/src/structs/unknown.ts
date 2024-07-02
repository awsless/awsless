import { Struct } from './struct'

export const unknown = () =>
	new Struct<string, unknown, unknown>(
		'S',
		value => JSON.stringify(value),
		value => (typeof value === 'undefined' ? value : JSON.parse(value))
	)
