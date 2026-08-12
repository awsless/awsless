import { BaseSchema, createSchema } from './schema'

export function string(): BaseSchema<'S', string, string>
export function string<T extends string>(): BaseSchema<'S', T, T>
export function string<T extends string>() {
	return createSchema<'S', T, T>({
		type: 'S',
	})
	// return new Schema<'S', T, T>(
	// 	'S',
	// 	value => ({ S: value }),
	// 	value => value.S as T
	// )
}
