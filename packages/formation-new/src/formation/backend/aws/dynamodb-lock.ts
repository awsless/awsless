import { DynamoDB } from '@aws-sdk/client-dynamodb'
import { AwsCredentialIdentity, AwsCredentialIdentityProvider } from '@aws-sdk/types'
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb'
import { URN } from '../../urn.ts'
import { LockBackend } from '../lock.ts'

type Props = {
	credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider
	region: string
	tableName: string
}

export class DynamoLockBackend implements LockBackend {
	protected client: DynamoDB

	constructor(private props: Props) {
		this.client = new DynamoDB(props)
	}

	async insecureReleaseLock(urn: URN) {
		await this.client.updateItem({
			TableName: this.props.tableName,
			Key: marshall({ urn }),
			ExpressionAttributeNames: { '#lock': 'lock' },
			UpdateExpression: 'REMOVE #lock',
		})
	}

	async locked(urn: URN) {
		const result = await this.client.getItem({
			TableName: this.props.tableName,
			Key: marshall({ urn }),
		})

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

		await this.client.updateItem({
			...props,
			UpdateExpression: 'SET #lock = :id',
			ConditionExpression: 'attribute_not_exists(#lock)',
		})

		return async () => {
			await this.client.updateItem({
				...props,
				UpdateExpression: 'REMOVE #lock',
				ConditionExpression: '#lock = :id',
			})
		}
	}
}
