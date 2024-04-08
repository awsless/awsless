import { AwsCredentialIdentity, AwsCredentialIdentityProvider } from '@aws-sdk/types'
import { CloudProvider, CreateProps, UpdateProps } from '../../../core/cloud'
import { CloudFrontClient, CreateInvalidationCommand } from '@aws-sdk/client-cloudfront'
import { sha256 } from '../../../core/hash'

type ProviderProps = {
	credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider
	region: string
}

type Document = {
	DistributionId: string
	Versions: Array<undefined | string>
	Paths: string[]
}

export class InvalidateCacheProvider implements CloudProvider {
	protected client: CloudFrontClient

	constructor(props: ProviderProps) {
		this.client = new CloudFrontClient(props)
	}

	own(id: string) {
		return id === 'aws-cloud-front-invalidate-cache'
	}

	private async invalidate(document: Document) {
		const id = sha256(JSON.stringify(document.Versions))

		await this.client.send(
			new CreateInvalidationCommand({
				DistributionId: document.DistributionId,
				InvalidationBatch: {
					CallerReference: id,
					Paths: {
						Items: document.Paths,
						Quantity: document.Paths.length,
					},
				},
			})
		)

		return id
	}

	async get() {
		return {}
	}

	async create({ document }: CreateProps<Document>) {
		return this.invalidate(document)
	}

	async update({ newDocument }: UpdateProps<Document>) {
		return this.invalidate(newDocument)
	}

	async delete() {}
}
