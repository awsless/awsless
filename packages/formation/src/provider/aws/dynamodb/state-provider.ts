import { URN } from '../../../core/resource'
import { AppState, StateProvider } from '../../../core/state'
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb'
import { DynamoDB, GetItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb'
import { AwsCredentialIdentity, AwsCredentialIdentityProvider } from '@aws-sdk/types'

type ProviderProps = {
	credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider
	region: string
	tableName: string
}

export class DynamoDBStateProvider implements StateProvider {
	protected client: DynamoDB
	protected id: number

	constructor(private props: ProviderProps) {
		this.client = new DynamoDB(props)
		this.id = Math.floor(Math.random() * 100_000)
	}

	async lock(urn: URN) {
		await this.client.send(
			new UpdateItemCommand({
				TableName: this.props.tableName,
				Key: marshall({ urn }),
				UpdateExpression: 'SET #lock = :id',
				ConditionExpression: 'attribute_not_exists(#lock)',
				ExpressionAttributeNames: { '#lock': 'lock' },
				ExpressionAttributeValues: { ':id': marshall(this.id) },
			})
		)

		return async () => {
			await this.client.send(
				new UpdateItemCommand({
					TableName: this.props.tableName,
					Key: marshall({ urn }),
					UpdateExpression: 'REMOVE #lock',
					ConditionExpression: '#lock = :id',
					ExpressionAttributeNames: { '#lock': 'lock' },
					ExpressionAttributeValues: { ':id': marshall(this.id) },
				})
			)
		}
	}

	async get(urn: URN) {
		const result = await this.client.send(
			new GetItemCommand({
				TableName: this.props.tableName,
				Key: marshall({ urn }),
			})
		)

		if (!result.Item) {
			return {}
		}

		const item = unmarshall(result.Item)

		return item.state ?? {}
	}

	async update(urn: URN, state: AppState) {
		// console.log('update', urn, JSON.stringify(state))

		await this.client.send(
			new UpdateItemCommand({
				TableName: this.props.tableName,
				Key: marshall({ urn }),
				UpdateExpression: 'SET #state = :state',
				ExpressionAttributeNames: { '#state': 'state' },
				ExpressionAttributeValues: marshall(
					{
						':state': JSON.parse(JSON.stringify(state)),
					},
					{
						removeUndefinedValues: true,
						convertEmptyValues: true,
					}
				),
			})
		)
	}

	async delete(urn: URN) {
		await this.client.send(
			new UpdateItemCommand({
				TableName: this.props.tableName,
				Key: marshall({ urn }),
				UpdateExpression: 'REMOVE #state',
				ExpressionAttributeNames: { '#state': 'state' },
			})
		)
	}
}