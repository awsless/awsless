import { StackConfig } from "../../../src";

export const topicStack:StackConfig = {
	name: 'topic',
	topics: {
		event: __dirname + '/../function/simple.ts'
	}
}
