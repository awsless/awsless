import { define, number, object, string } from "../../src";

export const users = define('users', {
	hash: 'id',
	schema: object({
		id: number(),
		name: string(),
	}),
})
