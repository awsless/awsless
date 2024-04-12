import { AwsCredentialIdentity, AwsCredentialIdentityProvider } from '@aws-sdk/types'
import { CloudProvider, CreateProps, DeleteProps, GetProps, UpdateProps } from '../../../core/cloud'
import {
	AppSyncClient,
	CreateDataSourceCommand,
	DeleteDataSourceCommand,
	GetDataSourceCommand,
	NotFoundException,
	UpdateDataSourceCommand,
} from '@aws-sdk/client-appsync'
import { ResourceNotFound } from '../../../core/error'

type ProviderProps = {
	credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider
	region: string
}

type Document = any

export class DataSourceProvider implements CloudProvider {
	protected client: AppSyncClient

	constructor(props: ProviderProps) {
		this.client = new AppSyncClient(props)
	}

	own(id: string) {
		return id === 'aws-appsync-data-source'
	}

	async get({ document }: GetProps<Document>) {
		const result = await this.client.send(
			new GetDataSourceCommand({
				apiId: document.apiId,
				name: document.name,
			})
		)

		return result.dataSource!
	}

	async create({ document }: CreateProps<Document>) {
		await this.client.send(
			new CreateDataSourceCommand({
				...document,
			})
		)

		return JSON.stringify([document.apiId, document.name])
	}

	async update({ id, oldDocument, newDocument }: UpdateProps<Document>) {
		if (oldDocument.apiId !== newDocument.apiId) {
			throw new Error(`DataSource can't update apiId`)
		}

		if (oldDocument.name !== newDocument.name) {
			throw new Error(`DataSource can't update name`)
		}

		await this.client.send(new UpdateDataSourceCommand(newDocument))

		return id
	}

	async delete({ document }: DeleteProps<Document>) {
		try {
			await this.client.send(
				new DeleteDataSourceCommand({
					apiId: document.apiId,
					name: document.name,
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
