import { StackConfig } from "../../../src";

export const tableStack: StackConfig = {
	name: 'table',

	functions: {
		log: __dirname + '/../log.ts',
	},

	tables: {
		stats: {
			hash: 'id',
			fields: {
				id: 'string'
			}
		}
	}
}
