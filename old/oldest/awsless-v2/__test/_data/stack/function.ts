import { StackConfig } from '../../../old/index.js'
// import { cacheStack } from './cache.js'
// import { tableStack } from './table.js'

export const functionStack: StackConfig = {
	name: 'function',
	depends: [
		// cacheStack,
		// tableStack
	],
	configs: ['test'],
	tests: __dirname + '/../test',
	functions: {
		call: __dirname + '/../function/call.ts',
		otherCall: __dirname + '/../function/call.ts',
		module: {
			file: __dirname + '/../function/module.ts',
			warm: 1,
			permissions: {
				actions: ['s3:PutObject'],
				resources: ['*'],
			},
		},
	},
}
