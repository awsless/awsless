import { StackConfig } from "../../../src/index.js";

export const queueStack: StackConfig = {
	name: 'queue',
	// functions: {
	// 	call: __dirname + '/../function/queue.ts'
	// },
	queues: {
		process: {
			consumer: __dirname + '/../function/queue.ts'
		}
	}
}
