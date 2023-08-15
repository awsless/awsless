import { StackConfig } from "../../../src";

export const tableStack: StackConfig = {
	name: 'table',

	tables: {
		stats: {
			hash: 'id',
			sort: 'lol',
			fields: {
				id: 'string'
			},
		}
	}
}
