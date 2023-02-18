
import { globalClient } from '@awsless/utils'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'

export const dynamoDBClient = globalClient(() => {
	return new DynamoDBClient({})
})

export const dynamoDBDocumentClient = globalClient(() => {
	return DynamoDBDocumentClient.from(dynamoDBClient(), {
		marshallOptions: {
			removeUndefinedValues: true
		}
	})
})
