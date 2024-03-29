import { AwsCredentialIdentity, AwsCredentialIdentityProvider } from '@aws-sdk/types'
import { CloudProvider, CreateProps, DeleteProps, GetProps, UpdateProps } from '../../../resource/cloud'
import {
	ChangeResourceRecordSetsCommand,
	ListResourceRecordSetsCommand,
	Route53Client,
} from '@aws-sdk/client-route-53'
import { randomUUID } from 'crypto'

type ProviderProps = {
	credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider
	region: string
}

type Document = {
	HostedZoneId: string
	Name: string
	Type: string
	ResourceRecords?: string[]
	TTL?: number
	Weight?: number
	AliasTarget?: {
		DNSName: string
		HostedZoneId: string
		EvaluateTargetHealth: boolean | undefined
	}
}

export class RecordSetProvider implements CloudProvider {
	protected client: Route53Client

	constructor(props: ProviderProps) {
		this.client = new Route53Client(props)
	}

	own(id: string) {
		return id === 'aws-route53-record-set'
	}

	async get({ id, document }: GetProps<Document>) {
		const result = await this.client.send(
			new ListResourceRecordSetsCommand({
				HostedZoneId: document.HostedZoneId,
				MaxItems: 1,
				StartRecordIdentifier: id,
				StartRecordName: document.Name,
				StartRecordType: document.Type,
			})
		)

		return result.ResourceRecordSets?.at(0)
	}

	private formatRecordSet(id: string, document: Document) {
		return {
			Name: document.Name,
			Type: document.Type,
			ResourceRecords: document.ResourceRecords?.map(Value => ({ Value })),
			Weight: document.Weight,
			TTL: document.TTL,
			SetIdentifier: id,
			AliasTarget: document.AliasTarget,
		}
	}

	async create({ document }: CreateProps<Document>) {
		const id = randomUUID()

		await this.client.send(
			new ChangeResourceRecordSetsCommand({
				HostedZoneId: document.HostedZoneId,
				ChangeBatch: {
					Changes: [
						{
							Action: 'CREATE',
							ResourceRecordSet: this.formatRecordSet(id, document),
						},
					],
				},
			})
		)

		return id
	}

	async update({ id, oldDocument, newDocument }: UpdateProps<Document>) {
		if (oldDocument.HostedZoneId !== newDocument.HostedZoneId) {
			throw new Error(`RecordSet hosted zone id can't be changed after creation.`)
		}

		if (oldDocument.Name !== newDocument.Name) {
			throw new Error(`RecordSet name id can't be changed after creation.`)
		}

		if (oldDocument.Type !== newDocument.Type) {
			throw new Error(`RecordSet type can't be changed after creation.`)
		}

		await this.client.send(
			new ChangeResourceRecordSetsCommand({
				HostedZoneId: newDocument.HostedZoneId,
				ChangeBatch: {
					Changes: [
						{
							Action: 'UPSERT',
							ResourceRecordSet: this.formatRecordSet(id, newDocument),
						},
					],
				},
			})
		)

		return id
	}

	async delete({ id, document }: DeleteProps<Document>) {
		await this.client.send(
			new ChangeResourceRecordSetsCommand({
				HostedZoneId: document.HostedZoneId,
				ChangeBatch: {
					Changes: [
						{
							Action: 'DELETE',
							ResourceRecordSet: this.formatRecordSet(id, document),
						},
					],
				},
			})
		)
	}
}
