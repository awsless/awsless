import { Schema } from './schema'

export const ttl = () =>
	new Schema<'N', Date, Date>(
		'N',
		value => ({ N: String(Math.floor(value.getTime() / 1000)) }),
		value => new Date(Number(value?.N) * 1000)
	)
