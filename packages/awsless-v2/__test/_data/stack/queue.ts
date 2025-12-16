import { defineStackConfig } from '../../../old/index.js'

export const queueStack = defineStackConfig({
	name: 'queue',
	// functions: {
	// 	call: __dirname + '/../function/queue.ts'
	// },
	queues: {
		process: {
			consumer: __dirname + '/../function/queue.ts',
		},
	},
})
