import { createSchema } from './schema'

export const date = () =>
	createSchema<'N', Date, Date>({
		type: 'N',
		encode: value => String(value.getTime()),
		decode: value => new Date(Number(value)),
	})
