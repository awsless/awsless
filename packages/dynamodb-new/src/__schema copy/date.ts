import { Schema } from './schema'

export const date = () =>
	new Schema<'N', Date, Date>(
		'N',
		value => ({ N: String(value.getTime()) }),
		value => new Date(Number(value.N))
	)
