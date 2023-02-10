
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'

import { globalClient } from '../helper.js'

export const dynamoDBClient = globalClient(() => {
	return new DynamoDBClient({})
})

export const dynamoDBDocumentClient = globalClient(() => {
	return DynamoDBDocumentClient.from(dynamoDBClient.get(), {
		marshallOptions: {
			removeUndefinedValues: true
		}
	})
})
