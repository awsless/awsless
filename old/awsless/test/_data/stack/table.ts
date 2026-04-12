import { StackConfig } from "../../../src/index.js";

export const tableStack: StackConfig = {
	name: 'table',

	functions: {
		get: __dirname + '/../function/table.ts'
	},

	tables: {
		stats: {
			hash: 'id',
			// sort: 'lol',
			// stream: {
			// 	type: 'new-image',
			// 	consumer: __dirname + '/../function/stream.ts'
			// }
		}
	}
}
