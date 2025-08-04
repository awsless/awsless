import { define, number, object, string } from '@awsless/dynamodb'
import { Table } from '../../../src/server'

export const stateTable = define(Table.stack.state, {
	hash: 'id',
	schema: object({
		id: number(),
		state: string<'started' | 'ended'>(),
	}),
})
