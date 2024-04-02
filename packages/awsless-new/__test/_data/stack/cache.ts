import { StackConfig } from '../../../old/index.js'

export const cacheStack: StackConfig = {
	name: 'cache',
	functions: {
		test: {
			file: __dirname + '/../function/redis.ts',
			vpc: true,
		},
	},
	caches: {
		cache: {},
	},
}
