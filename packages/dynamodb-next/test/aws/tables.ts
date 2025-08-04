import { date, define, number, object, optional, string } from '../../src'

export const users = define('users', {
	hash: 'id',
	schema: object({
		id: number(),
		name: string(),
		deletedAt: optional(date()),
	}),
})
