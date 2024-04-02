import { AwsCredentialIdentity, AwsCredentialIdentityProvider } from '@aws-sdk/types'
import { CloudProvider, CreateProps, DeleteProps, GetProps } from '../../../core/cloud'
import {
	ACMClient,
	DeleteCertificateCommand,
	DescribeCertificateCommand,
	RequestCertificateCommand,
	ResourceNotFoundException,
} from '@aws-sdk/client-acm'
import { KeyAlgorithm } from './certificate'
import { sha256 } from '../../../core/hash'
import { ResourceNotFound } from '../../../core/error'

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

	private wait(delay: number) {
		return new Promise(r => setTimeout(r, delay))
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

	async get({ id, extra }: GetProps<Document, Extra>) {
		const client = this.client(extra.region)
		while (true) {
			const result = await client.send(
				new DescribeCertificateCommand({
					CertificateArn: id,
				})
			)

			if (result.Certificate?.DomainValidationOptions?.at(0)?.ResourceRecord) {
				return result.Certificate
			}

			await this.wait(5000)
		}
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
		try {
			await this.client(extra.region).send(
				new DeleteCertificateCommand({
					CertificateArn: id,
				})
			)
		} catch (error) {
			if (error instanceof ResourceNotFoundException) {
				throw new ResourceNotFound(error.message)
			}

			throw error
		}
	}
}
