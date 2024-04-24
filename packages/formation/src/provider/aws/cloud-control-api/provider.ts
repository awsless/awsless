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
} from '../../../core/cloud'

import { createPatch } from 'rfc6902'
import { sleep } from '../../../core/hash'
import { Duration, minutes, toMilliSeconds } from '@awsless/duration'
import { ResourceNotFound } from '../../../core/error'
// import { retry } from '../../../core/retry'

type ProviderProps = {
	credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider
	region: string
	timeout?: Duration
	maxAttempts?: number
}

export class CloudControlApiProvider implements CloudProvider {
	protected client: CloudControlClient

	constructor(private props: ProviderProps) {
		this.client = new CloudControlClient({
			maxAttempts: 10,
			...props,
		})
	}

	own(id: string) {
		return id === 'aws-cloud-control-api'
	}

	private async progressStatus(event: ProgressEvent) {
		const token = event.RequestToken!
		const start = new Date()
		const timeout = Number(toMilliSeconds(this.props.timeout ?? minutes(1)))

		while (true) {
			if (event.OperationStatus === 'SUCCESS') {
				if (event.Identifier) {
					return event.Identifier
				} else {
					throw new Error(`AWS Cloud Control API Identifier not set for SUCCESS status.`)
				}
			}

			if (event.OperationStatus === 'FAILED') {
				if (event.ErrorCode === 'AlreadyExists') {
					if (event.Identifier) {
						return event.Identifier
					}

					// Sadly we can't heal from resources that already exist
					// without CloudControlApi returning the resource
					// identifier.
				}

				if (event.ErrorCode === 'NotFound') {
					throw new ResourceNotFound(event.StatusMessage)
				}

				throw new Error(`[${event.ErrorCode}] ${event.StatusMessage}`)
			}

			const now = Date.now()
			const elapsed = now - start.getTime()

			if (elapsed > timeout) {
				throw new Error('AWS Cloud Control API operation timeout.')
			}

			const after = event.RetryAfter?.getTime() ?? 0
			const delay = Math.max(after - now, 1000)

			await sleep(delay)

			// try {
			const status = await this.client.send(
				new GetResourceRequestStatusCommand({
					RequestToken: token,
				})
			)

			event = status.ProgressEvent!
			// } catch (error) {
			// 	// console.log(error)
			// 	// console.log(error.StatusMessage)
			// 	// console.log(['EHOSTUNREACH'].includes(error.StatusMessage))
			// }
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

	async create({ token, type, document }: CreateProps) {
		const result = await this.client.send(
			new CreateResourceCommand({
				TypeName: type,
				DesiredState: JSON.stringify(document),
				ClientToken: token,
			})
		)

		return this.progressStatus(result.ProgressEvent!)
	}

	async update({ token, type, id, oldDocument, newDocument, remoteDocument }: UpdateProps) {
		const result = await this.client.send(
			new UpdateResourceCommand({
				TypeName: type,
				Identifier: id,
				PatchDocument: JSON.stringify(this.updateOperations(remoteDocument, oldDocument, newDocument)),
				ClientToken: token,
			})
		)

		return this.progressStatus(result.ProgressEvent!)
	}

	async delete({ token, type, id }: DeleteProps) {
		const result = await this.client.send(
			new DeleteResourceCommand({
				TypeName: type,
				Identifier: id,
				ClientToken: token,
			})
		)

		await this.progressStatus(result.ProgressEvent!)

		// try {
		// 	await this.progressStatus(result.ProgressEvent!)
		// } catch (error) {
		// 	console.log('DELETE _WRONG_')
		// 	console.log(error)
		// 	throw error
		// }
	}
}
