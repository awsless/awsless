import { StackConfig } from "../../../src";

export const cacheStack:StackConfig = {
	name: 'cache',
	functions: {
		test: __dirname + '/../function/redis.ts',
	},
	caches: {
		cache: {}
	},
}
