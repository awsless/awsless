import { AwsCredentialIdentity, AwsCredentialIdentityProvider } from '@aws-sdk/types'
import { CloudProvider, CreateProps, DeleteProps, GetProps, UpdateProps } from '../../../core/cloud'
import {
	ApiGatewayV2Client,
	NotFoundException,
	CreateIntegrationCommand,
	UpdateIntegrationCommand,
	DeleteIntegrationCommand,
	GetIntegrationCommand,
	IntegrationType,
} from '@aws-sdk/client-apigatewayv2'
import { ResourceNotFound } from '../../../core/error'

type ProviderProps = {
	credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider
	region: string
}

type Document = {
	ApiId: string
	IntegrationType: IntegrationType
	IntegrationUri: string
	IntegrationMethod: string
	PayloadFormatVersion: '1.0' | '2.0'
	Description?: string
}

export class IntegrationProvider implements CloudProvider {
	private client: ApiGatewayV2Client

	constructor(props: ProviderProps) {
		this.client = new ApiGatewayV2Client(props)
	}

	own(id: string) {
		return id === 'aws-api-gateway-v2-integration'
	}

	async get({ id, document }: GetProps<Document>) {
		const result = await this.client.send(
			new GetIntegrationCommand({
				ApiId: document.ApiId,
				IntegrationId: id,
			})
		)

		return result
	}

	async create({ document }: CreateProps<Document>) {
		const result = await this.client.send(new CreateIntegrationCommand(document))
		return result.IntegrationId!
	}

	async update({ id, oldDocument, newDocument }: UpdateProps<Document>) {
		if (oldDocument.ApiId !== newDocument.ApiId) {
			throw new Error(`Integration can't change the api id`)
		}

		const result = await this.client.send(
			new UpdateIntegrationCommand({
				...newDocument,
				IntegrationId: id,
			})
		)

		return result.IntegrationId!
	}

	async delete({ id, document }: DeleteProps<Document>) {
		try {
			await this.client.send(
				new DeleteIntegrationCommand({
					ApiId: document.ApiId,
					IntegrationId: id,
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
