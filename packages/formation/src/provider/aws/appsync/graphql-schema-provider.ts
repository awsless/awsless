import {
	AppSyncClient,
	DeleteGraphqlApiCommand,
	GetSchemaCreationStatusCommand,
	NotFoundException,
	StartSchemaCreationCommand,
} from '@aws-sdk/client-appsync'
import { AwsCredentialIdentity, AwsCredentialIdentityProvider } from '@aws-sdk/types'
import { CloudProvider, CreateProps, DeleteProps, UpdateProps } from '../../../core/cloud'
import { ResourceNotFound } from '../../../core/error'
import { sleep } from '../../../core/hash'

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

	private async waitStatusComplete(id: string) {
		while (true) {
			const result = await this.client.send(
				new GetSchemaCreationStatusCommand({
					apiId: id,
				})
			)

			if (result.status === 'FAILED') {
				throw new Error(result.details)
			}

			if (result.status === 'SUCCESS' || result.status === 'ACTIVE') {
				return
			}

			await sleep(5000)
		}
	}

	async get() {
		return {}
	}

	async create({ document, assets }: CreateProps<Document>) {
		await this.client.send(
			new StartSchemaCreationCommand({
				apiId: document.apiId,
				definition: assets.definition?.data,
			})
		)

		await this.waitStatusComplete(document.apiId)

		return document.apiId
	}

	async update({ oldDocument, newDocument, newAssets }: UpdateProps<Document>) {
		if (oldDocument.apiId !== newDocument.apiId) {
			throw new Error(`GraphGLSchema can't change the api id`)
		}

		await this.client.send(
			new StartSchemaCreationCommand({
				apiId: newDocument.apiId,
				definition: newAssets.definition?.data,
			})
		)

		await this.waitStatusComplete(newDocument.apiId)

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
