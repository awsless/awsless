import { LambdaClient, UpdateFunctionCodeCommand } from '@aws-sdk/client-lambda'
import { AwsCredentialIdentity, AwsCredentialIdentityProvider } from '@aws-sdk/types'
import { CloudProvider, CreateProps, UpdateProps } from '../../../core/cloud'

type ProviderProps = {
	credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider
	region: string
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

export class SourceCodeUpdateProvider implements CloudProvider {
	protected client: LambdaClient

	constructor(props: ProviderProps) {
		this.client = new LambdaClient(props)
	}

	own(id: string) {
		return id === 'aws-lambda-source-code-update'
	}

	async get() {
		return {}
	}

	async create(props: CreateProps<Document>) {
		return props.document.FunctionName
	}

	async update(props: UpdateProps<Document>) {
		if (props.oldAssets.version !== props.newAssets.version?.hash) {
			await this.updateFunctionCode(props)
		}

		return props.newDocument.FunctionName
	}

	async delete() {}

	private async updateFunctionCode(props: UpdateProps<Document>) {
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
