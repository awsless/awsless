// import { Schema } from './schema'

import { createSchema } from './schema'

// export const ttl = () =>
// 	new Schema<'N', Date, Date>(
// 		'N',
// 		value => ({ N: String(Math.floor(value.getTime() / 1000)) }),
// 		value => new Date(Number(value?.N) * 1000)
// 	)

export const ttl = () =>
	createSchema<'N', Date, Date>({
		type: 'N',
		encode: value => String(Math.floor(value.getTime() / 1000)),
		decode: value => new Date(Number(value) * 1000),
	})
