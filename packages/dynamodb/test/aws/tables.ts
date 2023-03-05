import { bigfloat, bigint, define, number, object, optional, string, stringSet } from "../../src";

export const posts = define('posts', {
	hash: 'userId',
	sort: 'id',
	schema: object({
		id: number(),
		sortId: number(),
		userId: number(),

		title: optional(string()),
		amount: bigfloat(),

		attributes: object({
			likes: bigint(),
			tags: stringSet(),
		})
	}),
	indexes: {
		list: {
			hash: 'userId',
			sort: 'sortId'
		},
	}
})

export const users = define('users', {
	hash: 'id',
	schema: object({
		id: number(),
		name: string(),
	}),
})
