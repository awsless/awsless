
import { CreateTableCommand, CreateTableCommandInput, DynamoDBClient } from '@aws-sdk/client-dynamodb'

export const migrate = (client:DynamoDBClient, tables:CreateTableCommandInput | CreateTableCommandInput[]) => {
	return Promise.all([ tables ].flat().map(definition => {
		return client.send(new CreateTableCommand({
			...definition,
			BillingMode: 'PAY_PER_REQUEST',
		}))
	}))
}
