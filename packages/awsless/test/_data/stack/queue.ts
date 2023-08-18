import { StackConfig } from "../../../src";

export const queueStack: StackConfig = {
	name: 'queue',
	queues: {
		process: {
			consumer: __dirname + '/../function/simple.ts'
		}
	}
}
