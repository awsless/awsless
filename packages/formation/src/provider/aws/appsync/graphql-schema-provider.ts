import { AwsCredentialIdentity, AwsCredentialIdentityProvider } from '@aws-sdk/types'
import { CloudProvider, CreateProps, DeleteProps, GetProps, UpdateProps } from '../../../core/cloud'
import {
	AppSyncClient,
	DeleteGraphqlApiCommand,
	GetSchemaCreationStatusCommand,
	NotFoundException,
	StartSchemaCreationCommand,
} from '@aws-sdk/client-appsync'
import { sleep } from '../../../core/hash'
import { ResourceNotFound } from '../../../core/error'

type ProviderProps = {
	credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider
	region: string
}

type Document = {
	apiId: string
}

export class GraphQLSchemaProvider implements CloudProvider {
	protected client: AppSyncClient

	constructor(props: ProviderProps) {
		this.client = new AppSyncClient(props)
	}

	own(id: string) {
		return id === 'aws-appsync-graphql-schema'
	}

	async get({ id }: GetProps<Document>) {
		while (true) {
			const result = await this.client.send(
				new GetSchemaCreationStatusCommand({
					apiId: id,
				})
			)

			if (result.status === 'FAILED') {
				throw new Error('Failed updating graphql schema')
			}

			if (result.status === 'SUCCESS' || result.status === 'ACTIVE') {
				return {}
			}

			await sleep(5000)
		}
	}

	async create({ document, assets }: CreateProps<Document>) {
		await this.client.send(
			new StartSchemaCreationCommand({
				apiId: document.apiId,
				definition: assets.definition?.data,
			})
		)

		return document.apiId
	}

	async update({ oldDocument, newDocument, assets }: UpdateProps<Document>) {
		if (oldDocument.apiId !== newDocument.apiId) {
			throw new Error(`GraphGLSchema can't change the api id`)
		}

		await this.client.send(
			new StartSchemaCreationCommand({
				apiId: newDocument.apiId,
				definition: assets.definition?.data,
			})
		)

		return newDocument.apiId
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