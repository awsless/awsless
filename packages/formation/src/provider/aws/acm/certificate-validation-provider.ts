import { AwsCredentialIdentity, AwsCredentialIdentityProvider } from '@aws-sdk/types'
import { CloudProvider, CreateProps, GetProps, UpdateProps } from '../../../resource/cloud'
import { ACMClient, DescribeCertificateCommand } from '@aws-sdk/client-acm'

type ProviderProps = {
	credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider
	region: string
}

type Extra = {
	region?: string
}

type Document = {
	CertificateArn: string
}

export class CertificateValidationProvider implements CloudProvider {
	protected client: ACMClient

	constructor(props: ProviderProps) {
		this.client = new ACMClient(props)
	}

	own(id: string) {
		return id === 'aws-acm-certificate-validation'
	}

	async get({ id }: GetProps<Document, Extra>) {
		while (true) {
			const result = await this.client.send(
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
					return { Status: 'ISSUED' }
			}

			await new Promise(resolve => setTimeout(resolve, 5000))
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
