import { StackConfig } from "../../../src";

export const queueStack: StackConfig = {
	name: 'queue',
	queues: {
		process: 'test/_data/function.ts'
	}
}
