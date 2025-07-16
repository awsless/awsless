import { createSchema } from './schema'

export const boolean = () =>
	createSchema<'BOOL', boolean, boolean>({
		type: 'BOOL',
	})
