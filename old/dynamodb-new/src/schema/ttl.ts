import { createSchema } from './schema'

export const ttl = () =>
	createSchema<'N', Date, Date>({
		type: 'N',
		encode: value => String(Math.floor(value.getTime() / 1000)),
		decode: value => new Date(Number(value) * 1000),
	})
