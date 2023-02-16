
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb'

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
				if(error instanceof Error) {
					throw new Error(`DynamoDB Seeding Error: ${error.message}`)
				}

				throw error
			}
		}))
	}))
}
