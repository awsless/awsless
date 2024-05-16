import { AwsCredentialIdentity, AwsCredentialIdentityProvider } from '@aws-sdk/types'
import { CloudProvider, CreateProps, DeleteProps, GetProps, UpdateProps } from '../../../core/cloud'
import {
	ApiGatewayV2Client,
	CreateStageCommand,
	DeleteStageCommand,
	GetStageCommand,
	UpdateStageCommand,
	NotFoundException,
} from '@aws-sdk/client-apigatewayv2'
import { ResourceNotFound } from '../../../core/error'

type ProviderProps = {
	credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider
	region: string
}

type Document = {
	ApiId: string
	StageName: string
	AutoDeploy: boolean
	DeploymentId?: string
	Description?: string
}

export class StageProvider implements CloudProvider {
	private client: ApiGatewayV2Client

	constructor(props: ProviderProps) {
		this.client = new ApiGatewayV2Client(props)
	}

	own(id: string) {
		return id === 'aws-api-gateway-v2-stage'
	}

	async get({ document }: GetProps<Document>) {
		const result = await this.client.send(
			new GetStageCommand({
				ApiId: document.ApiId,
				StageName: document.StageName,
			})
		)

		return result
	}

	async create({ document }: CreateProps<Document>) {
		const result = await this.client.send(new CreateStageCommand(document))
		return result.StageName!
	}

	async update({ oldDocument, newDocument }: UpdateProps<Document>) {
		if (oldDocument.ApiId !== newDocument.ApiId) {
			throw new Error(`Stage can't change the api id`)
		}

		if (oldDocument.StageName !== newDocument.StageName) {
			throw new Error(`Stage can't change the stage name`)
		}

		const result = await this.client.send(new UpdateStageCommand(newDocument))
		return result.StageName!
	}

	async delete({ document }: DeleteProps<Document>) {
		try {
			await this.client.send(
				new DeleteStageCommand({
					ApiId: document.ApiId,
					StageName: document.StageName,
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
