import { LambdaClient, UpdateFunctionCodeCommand } from '@aws-sdk/client-lambda'
import { AwsCredentialIdentity, AwsCredentialIdentityProvider } from '@aws-sdk/types'
import { CloudProvider, CreateProps, DeleteProps, GetProps, UpdateProps } from '../../../core/cloud'

type ProviderProps = {
	credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider
	region: string
	cloudProvider: CloudProvider
}

type Document = {
	FunctionName: string
	Architectures: string[]
	Code:
		| {
				S3Bucket: string
				S3Key: string
				S3ObjectVersion?: string
		  }
		| {
				ImageUri: string
		  }
		| {
				ZipFile: string
		  }
}

export class FunctionProvider implements CloudProvider {
	protected client: LambdaClient

	constructor(private props: ProviderProps) {
		this.client = new LambdaClient(props)
	}

	own(id: string) {
		return id === 'aws-lambda-function'
	}

	async get(props: GetProps) {
		return this.props.cloudProvider.get(props)
	}

	async create(props: CreateProps) {
		return this.props.cloudProvider.create(props)
	}

	async update(props: UpdateProps<Document>) {
		const id = await this.props.cloudProvider.update(props)

		if (props.newAssets.sourceCodeHash && props.oldAssets.sourceCodeHash !== props.newAssets.sourceCodeHash.hash) {
			await this.updateFunctionCode(props)
		}

		return id
	}

	async delete(props: DeleteProps) {
		return this.props.cloudProvider.delete(props)
	}

	async updateFunctionCode(props: UpdateProps<Document>) {
		const code = props.newDocument.Code

		if ('ZipFile' in code) {
			// ignore zip file changes
			return
		}

		await this.client.send(
			new UpdateFunctionCodeCommand({
				FunctionName: props.newDocument.FunctionName,
				Architectures: props.newDocument.Architectures,
				...code,
			})
		)
	}
}
