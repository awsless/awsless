import { CreateTableCommand, CreateTableCommandInput, DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { AnyTable, Table } from '../table'
import { serializeTable } from './serialize'

export const migrate = (
	client: DynamoDBClient,
	tables: CreateTableCommandInput | CreateTableCommandInput[] | AnyTable | AnyTable[]
) => {
	return Promise.all(
		[tables].flat().map(table => {
			if (table instanceof Table) {
				table = serializeTable(table)
			}

			return client.send(
				new CreateTableCommand({
					...table,
					BillingMode: 'PAY_PER_REQUEST',

					// Fix for using the older & faster local dynamodb v3

					// ProvisionedThroughput: {
					// 	ReadCapacityUnits: 1,
					// 	WriteCapacityUnits: 1,
					// },
					// GlobalSecondaryIndexes: table.GlobalSecondaryIndexes?.map(index => {
					// 	return {
					// 		...index,
					// 		ProvisionedThroughput: {
					// 			ReadCapacityUnits: 1,
					// 			WriteCapacityUnits: 1,
					// 		},
					// 	}
					// }),
				})
			)
		})
	)
}
