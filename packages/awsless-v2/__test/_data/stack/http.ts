import { StackConfig } from '../../../old/index.js'

export const httpStack: StackConfig = {
	name: 'http',
	http: {
		api: {
			'GET /': __dirname + '/../function/route.ts',
			'GET /path': __dirname + '/../function/route.ts',
			'GET /path/{id}': __dirname + '/../function/route.ts',
			'GET /path/{id}/some/{page}': __dirname + '/../function/route.ts',
		},
	},
}
