import { StackConfig } from "../../../src/index.js";

export const topicStack:StackConfig = {
	name: 'topic',
	// topics: {
	// 	event: __dirname + '/../function/simple.ts'
	// },

	topics: [
		'login',
	],
	subscribers: {
		login: __dirname + '/../function/simple.ts',
	}
}
