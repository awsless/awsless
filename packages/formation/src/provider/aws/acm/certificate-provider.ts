import { AwsCredentialIdentity, AwsCredentialIdentityProvider } from '@aws-sdk/types'
import { CloudProvider, CreateProps, DeleteProps, GetProps } from '../../../resource/cloud'
import {
	ACMClient,
	DeleteCertificateCommand,
	DescribeCertificateCommand,
	RequestCertificateCommand,
} from '@aws-sdk/client-acm'
import { KeyAlgorithm } from './certificate'
import { sha256 } from '../../../resource/hash'

type ProviderProps = {
	credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider
	region: string
}

type Extra = {
	region?: string
}

type Document = {
	DomainName: string
	SubjectAlternativeNames: string[]
	DomainValidationOptions: {
		DomainName: string
		ValidationDomain: string
	}[]
	ValidationMethod: 'DNS' | 'EMAIL'
	KeyAlgorithm: KeyAlgorithm
}

export class CertificateProvider implements CloudProvider {
	protected clients: Record<string, ACMClient> = {}

	constructor(private props: ProviderProps) {}

	own(id: string) {
		return id === 'aws-acm-certificate'
	}

	private client(region: string = this.props.region) {
		if (!this.clients[region]) {
			this.clients[region] = new ACMClient({
				...this.props,
				region,
			})
		}

		return this.clients[region]
	}

	async get({ id, extra }: GetProps<Document, Extra>) {
		const result = await this.client(extra.region).send(
			new DescribeCertificateCommand({
				CertificateArn: id,
			})
		)

		return result.Certificate!
	}

	async create({ urn, document, extra }: CreateProps<Document, Extra>) {
		const token = sha256(urn).substring(0, 32)
		const result = await this.client(extra.region).send(
			new RequestCertificateCommand({
				IdempotencyToken: token,
				...document,
			})
		)

		return result.CertificateArn!
	}

	async update() {
		throw new Error(`Certificate can't be changed`)
		return ''
	}

	async delete({ id, extra }: DeleteProps<Document, Extra>) {
		await this.client(extra.region).send(
			new DeleteCertificateCommand({
				CertificateArn: id,
			})
		)
	}
}
