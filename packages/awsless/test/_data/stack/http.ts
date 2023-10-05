import { StackConfig } from "../../../src/index.js";

export const httpStack: StackConfig = {
	name: 'http',
	http: {
		api: {
			'GET /': __dirname + '/../function/route.ts',
			'GET /path': __dirname + '/../function/route.ts',
		}
	},
}
