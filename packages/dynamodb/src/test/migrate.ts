
import { CreateTableCommand, DynamoDBClient } from '@aws-sdk/client-dynamodb'

export const migrate = (client:DynamoDBClient, schema:string | string[]) => {
	return Promise.all(parseTables(schema).map(definition => {
		return client.send(new CreateTableCommand(definition))
	}))
}

type Resource = {
	Type: string
	Properties: Properties
}

type Properties = {
	TableName: string
	KeySchema: {
		KeyType: string
		AttributeName: string
		AttributeType: string
	}[]

	AttributeDefinitions: {
		AttributeName: string
		AttributeType: string
	}[]

	TableClass?: string
	TimeToLiveSpecification?: string
	PointInTimeRecoverySpecification?: string
	StreamSpecification?: {
		StreamEnabled: boolean
	}

	Tags?: {
		Key:string
		Value: string
	}[]
}


export const parseTables = (schemas: string | string[]) => {
	const tables:Properties[] = []

	if(!Array.isArray(schemas)) {
		schemas = [ schemas ]
	}

	schemas.forEach(async (schema) => {
		const template = JSON.parse(schema) as { Resources: Resource[] }

		Object.values(template.Resources).forEach((resource) => {
			if(resource.Type !== 'AWS::DynamoDB::Table') {
				return
			}

			const properties = Object.assign({}, resource.Properties, {
				BillingMode: 'PAY_PER_REQUEST'
			})

			delete properties.TableClass
			delete properties.TimeToLiveSpecification
			delete properties.PointInTimeRecoverySpecification
			delete properties.Tags

			if(properties.StreamSpecification) {
				properties.StreamSpecification.StreamEnabled = true
			}

			tables.push(properties)
		})
	})

	return tables
}
