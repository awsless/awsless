import { AwsCredentialIdentity, AwsCredentialIdentityProvider } from '@aws-sdk/types'
import { CloudProvider, CreateProps, DeleteProps, GetProps, UpdateProps } from '../../../core/cloud'
import {
	AppSyncClient,
	CreateGraphqlApiCommand,
	DeleteGraphqlApiCommand,
	GetGraphqlApiCommand,
	NotFoundException,
	UpdateGraphqlApiCommand,
} from '@aws-sdk/client-appsync'
import { ResourceNotFound } from '../../../core/error'

type ProviderProps = {
	credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider
	region: string
}

type Document = any

export class GraphQLApiProvider implements CloudProvider {
	protected client: AppSyncClient

	constructor(props: ProviderProps) {
		this.client = new AppSyncClient(props)
	}

	own(id: string) {
		return id === 'aws-appsync-graphql-api'
	}

	async get({ id }: GetProps<Document>) {
		const result = await this.client.send(
			new GetGraphqlApiCommand({
				apiId: id,
			})
		)

		return result.graphqlApi!
	}

	async create({ document }: CreateProps<Document>) {
		const result = await this.client.send(
			new CreateGraphqlApiCommand({
				...document,
			})
		)
		return result.graphqlApi?.apiId!
	}

	async update({ id, newDocument }: UpdateProps<Document>) {
		await this.client.send(
			new UpdateGraphqlApiCommand({
				apiId: id,
				...newDocument,
			})
		)

		return id
	}

	async delete({ id }: DeleteProps<Document>) {
		try {
			await this.client.send(
				new DeleteGraphqlApiCommand({
					apiId: id,
				})
			)
		} catch (error) {
			if (error instanceof NotFoundException) {
				throw new ResourceNotFound(error.message)
			}

			throw error
		}
	}
}
