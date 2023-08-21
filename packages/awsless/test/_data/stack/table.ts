import { StackConfig } from "../../../src";

export const tableStack: StackConfig = {
	name: 'table',

	tables: {
		stats: {
			hash: 'id',
			// sort: 'lol',
			// fields: {
			// 	id: 'string'
			// },
			// stream: {
			// 	type: 'new-image',
			// 	consumer: __dirname + '/../function/stream.ts'
			// }
		}
	}
}
