import { AwsCredentialIdentity, AwsCredentialIdentityProvider } from '@aws-sdk/types'
import { CloudProvider, CreateProps, DeleteProps, UpdateProps } from '../../../core/cloud'
import { DynamoDB } from '@aws-sdk/client-dynamodb'

type ProviderProps = {
	credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider
	region: string
}

type Document = {
	table: string
	hash: string
	sort?: string
}

export class ImageProvider implements CloudProvider {
	protected client: DynamoDB

	constructor(props: ProviderProps) {
		this.client = new DynamoDB(props)
	}

	own(id: string) {
		return id === 'aws-dynamodb-table-item'
	}

	async get() {
		return {}
	}

	async create({ document, assets }: CreateProps<Document>) {
		return ''
	}

	async update({ id, oldDocument, newDocument, assets }: UpdateProps<Document>) {
		return ''
	}

	async delete({ id }: DeleteProps<Document>) {
		return ''
	}
}
