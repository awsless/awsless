import { URN } from '../../../core/resource'
import { LockProvider as Provider } from '../../../core/lock'
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb'
import { DynamoDB, GetItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb'
import { AwsCredentialIdentity, AwsCredentialIdentityProvider } from '@aws-sdk/types'

type ProviderProps = {
	credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider
	region: string
	tableName: string
}

export class LockProvider implements Provider {
	protected client: DynamoDB

	constructor(private props: ProviderProps) {
		this.client = new DynamoDB(props)
	}

	async locked(urn: URN) {
		const result = await this.client.send(
			new GetItemCommand({
				TableName: this.props.tableName,
				Key: marshall({ urn }),
			})
		)

		if (!result.Item) {
			return false
		}

		const item = unmarshall(result.Item)

		return typeof item.lock === 'number'
	}

	async lock(urn: URN) {
		const id = Math.floor(Math.random() * 100_000)

		const props = {
			TableName: this.props.tableName,
			Key: marshall({ urn }),
			ExpressionAttributeNames: { '#lock': 'lock' },
			ExpressionAttributeValues: { ':id': marshall(id) },
		}

		await this.client.send(
			new UpdateItemCommand({
				...props,
				UpdateExpression: 'SET #lock = :id',
				ConditionExpression: 'attribute_not_exists(#lock)',
			})
		)

		return async () => {
			await this.client.send(
				new UpdateItemCommand({
					...props,
					UpdateExpression: 'REMOVE #lock',
					ConditionExpression: '#lock = :id',
				})
			)
		}
	}
}
