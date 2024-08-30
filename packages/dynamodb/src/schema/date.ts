import { Schema } from './schema'

export const date = () =>
	new Schema<Date, Date>(
		value => ({ N: String(value.getTime()) }),
		value => new Date(Number(value.N))
	)
