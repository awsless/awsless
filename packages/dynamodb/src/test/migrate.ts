
import { CreateTableCommand, CreateTableCommandInput, DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { AnyTableDefinition, TableDefinition } from '../table'
import { serializeTable } from './serialize'

export const migrate = (
	client:DynamoDBClient,
	tables:CreateTableCommandInput | CreateTableCommandInput[] | AnyTableDefinition | AnyTableDefinition[]
) => {
	return Promise.all([ tables ].flat().map(table => {
		if(table instanceof TableDefinition) {
			table = serializeTable(table)
		}

		return client.send(new CreateTableCommand({
			...table,
			BillingMode: 'PAY_PER_REQUEST',
		}))
	}))
}
