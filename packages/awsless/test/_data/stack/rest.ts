import { StackConfig } from '../../../src/index.js'

export const restStack: StackConfig = {
	name: 'rest',

	rest: {
		api: {
			'GET /': __dirname + '/../function/route.ts',
			'GET /path': __dirname + '/../function/route.ts',
			'GET /path/{id}': __dirname + '/../function/route.ts',
		},
	},
}
