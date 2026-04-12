import { ACMClient, DescribeCertificateCommand } from '@aws-sdk/client-acm'
import { AwsCredentialIdentity, AwsCredentialIdentityProvider } from '@aws-sdk/types'
import { CloudProvider, CreateProps, GetProps, UpdateProps } from '../../../core/cloud'

type ProviderProps = {
	credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider
	region: string
}

type Document = {
	Region: string
	CertificateArn: string
}

export class CertificateValidationProvider implements CloudProvider {
	protected clients: Record<string, ACMClient> = {}

	constructor(private props: ProviderProps) {}

	own(id: string) {
		return id === 'aws-acm-certificate-validation'
	}

	private client(region: string = this.props.region) {
		if (!this.clients[region]) {
			this.clients[region] = new ACMClient({
				...this.props,
				region,
			})
		}

		return this.clients[region]!
	}

	private wait(delay: number) {
		return new Promise(r => setTimeout(r, delay))
	}

	async get({ id, document }: GetProps<Document>) {
		const client = this.client(document.Region)

		while (true) {
			const result = await client.send(
				new DescribeCertificateCommand({
					CertificateArn: id,
				})
			)

			switch (result.Certificate?.Status) {
				case 'EXPIRED':
					throw new Error(`Certificate is expired`)

				case 'INACTIVE':
					throw new Error(`Certificate is inactive`)

				case 'FAILED':
					throw new Error(`Certificate validation failed`)

				case 'VALIDATION_TIMED_OUT':
					throw new Error(`Certificate validation timed out`)

				case 'REVOKED':
					throw new Error(`Certificate revoked`)

				case 'ISSUED':
					return result.Certificate!
			}

			await this.wait(5000)
		}
	}

	async create({ document }: CreateProps<Document>) {
		return document.CertificateArn
	}

	async update({ newDocument }: UpdateProps<Document>) {
		return newDocument.CertificateArn
	}

	async delete() {}
}
