import { StackConfig } from '../../../old/index.js'

export const topicStack: StackConfig = {
	name: 'topic',
	// topics: {
	// 	event: __dirname + '/../function/simple.ts'
	// },

	topics: ['debug', 'login'],
	subscribers: {
		login: __dirname + '/../function/simple.ts',
		debug: 'info@jacksclub.io',
	},
}
