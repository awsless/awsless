
import { CreateTableCommand, DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb'

export const migrate = (client:DynamoDBClient, definitions) => {
	return Promise.all(definitions.map(definition => {
		return client.send(new CreateTableCommand(definition))
	}))
}

export type SeedData = {[key:string]: object[]}

export const seed = (client:DynamoDBDocumentClient, data: SeedData) => {
	return Promise.all(Object.entries(data).map(([TableName, items]) => {
		return Promise.all(items.map(async item => {
			try {
				await client.send(new PutCommand({
					TableName,
					Item: item,
				}))
			} catch(error) {
				throw new Error(`DynamoDB Seeding Error: ${error.message}`)
			}
		}))
	}))
}
