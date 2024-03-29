import {
	CloudControlClient,
	CreateResourceCommand,
	DeleteResourceCommand,
	GetResourceCommand,
	GetResourceRequestStatusCommand,
	ProgressEvent,
	UpdateResourceCommand,
} from '@aws-sdk/client-cloudcontrol'
import { AwsCredentialIdentity, AwsCredentialIdentityProvider } from '@aws-sdk/types'
import {
	CloudProvider,
	CreateProps,
	DeleteProps,
	GetProps,
	ResourceDocument,
	UpdateProps,
} from '../../../resource/cloud'

import { createPatch } from 'rfc6902'

type ProviderProps = {
	credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider
	region: string
}

export class CloudControlApiProvider implements CloudProvider {
	protected client: CloudControlClient

	constructor(props: ProviderProps) {
		this.client = new CloudControlClient(props)
	}

	own(id: string) {
		return id === 'aws-cloud-control-api'
	}

	private wait(delay: number) {
		return new Promise(r => setTimeout(r, delay))
	}

	private async progressStatus(event: ProgressEvent) {
		const token = event.RequestToken!

		while (true) {
			if (event.OperationStatus === 'SUCCESS') {
				return event.Identifier!
			}

			if (event.OperationStatus === 'FAILED') {
				throw new Error(`[${event.ErrorCode}] ${event.StatusMessage}`)
			}

			const now = Date.now()
			const after = event.RetryAfter?.getTime() ?? 0
			const delay = Math.min(Math.max(after - now, 1000), 5000)

			await this.wait(delay)

			const status = await this.client.send(
				new GetResourceRequestStatusCommand({
					RequestToken: token,
				})
			)

			event = status.ProgressEvent!
		}
	}

	private updateOperations(remoteDocument: any, oldDocument: ResourceDocument, newDocument: ResourceDocument) {
		// https://github.com/pulumi/pulumi-aws-native/pull/678
		// Remove write-only fields from the old document so we add write-only again.
		for (const key in oldDocument) {
			if (typeof remoteDocument[key]) {
				delete oldDocument[key]
			}
		}

		const operations = createPatch(oldDocument, newDocument)

		return operations
	}

	async get({ id, type }: GetProps) {
		const result = await this.client.send(
			new GetResourceCommand({
				TypeName: type,
				Identifier: id,
			})
		)

		return JSON.parse(result.ResourceDescription!.Properties!)
	}

	async create({ type, document }: CreateProps) {
		const result = await this.client.send(
			new CreateResourceCommand({
				TypeName: type,
				DesiredState: JSON.stringify(document),
			})
		)

		return this.progressStatus(result.ProgressEvent!)
	}

	async update({ type, id, oldDocument, newDocument, remoteDocument }: UpdateProps) {
		const result = await this.client.send(
			new UpdateResourceCommand({
				TypeName: type,
				Identifier: id,
				PatchDocument: JSON.stringify(this.updateOperations(remoteDocument, oldDocument, newDocument)),
			})
		)

		return this.progressStatus(result.ProgressEvent!)
	}

	async delete({ type, id }: DeleteProps) {
		const result = await this.client.send(
			new DeleteResourceCommand({
				TypeName: type,
				Identifier: id,
			})
		)

		await this.progressStatus(result.ProgressEvent!)
	}
}
