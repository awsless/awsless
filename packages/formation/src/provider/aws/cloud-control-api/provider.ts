import {
	CloudControlClient,
	CreateResourceCommand,
	CreateResourceCommandOutput,
	DeleteResourceCommand,
	DeleteResourceCommandOutput,
	GetResourceCommand,
	GetResourceRequestStatusCommand,
	GetResourceRequestStatusCommandOutput,
	ProgressEvent,
	ResourceNotFoundException,
	ThrottlingException,
	UpdateResourceCommand,
	UpdateResourceCommandOutput,
} from '@aws-sdk/client-cloudcontrol'
import { AwsCredentialIdentity, AwsCredentialIdentityProvider } from '@aws-sdk/types'
import { CloudProvider, CreateProps, DeleteProps, GetProps, ResourceDocument, UpdateProps } from '../../../core/cloud'

import { Duration, minutes, toMilliSeconds } from '@awsless/duration'
import { backOff } from 'exponential-backoff'
import objectPath from 'object-path'
import { createPatch } from 'rfc6902'
import { ResourceNotFound } from '../../../core/error'
import { sleep } from '../../../core/hash'
// import { exponential-backoff }
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
			requestHandler: {
				httpsAgent: {
					maxSockets: 10,
					maxTotalSockets: 10,
				},
			},
			...props,
		})
	}

	own(id: string) {
		return id === 'aws-cloud-control-api'
	}

	private async send(command: CreateResourceCommand): Promise<CreateResourceCommandOutput>
	private async send(command: UpdateResourceCommand): Promise<UpdateResourceCommandOutput>
	private async send(command: DeleteResourceCommand): Promise<DeleteResourceCommandOutput>
	private async send(command: GetResourceRequestStatusCommand): Promise<GetResourceRequestStatusCommandOutput>
	private async send(command: any) {
		return backOff(
			() => {
				return this.client.send(command)
			},
			{
				numOfAttempts: 20,
				maxDelay: 1000 * 10,
				retry(error) {
					if (error instanceof ThrottlingException) {
						console.log('ThrottlingException')

						return true
					}

					return false
				},
			}
		)
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

					// For some reason they do include the identifier inside the error message tho.
					// We could parse the identifier from the error message.
					// Example: Resource of type 'AWS::AppSync::DomainNameApiAssociation' with identifier 'admin-api.getblockalert.com/ApiAssociation' already exists.
				}

				if (event.ErrorCode === 'NotFound') {
					throw new ResourceNotFound(event.StatusMessage)
				}

				// if(event.ErrorCode === 'InternalFailure') {
				// 	throw new Error(`[${event.ErrorCode}] ${event.StatusMessage}`)
				// }

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

	private updateOperations(
		remoteDocument: ResourceDocument,
		oldDocument: ResourceDocument,
		newDocument: ResourceDocument,
		requiredFields: string[] = []
	) {
		// Remove write-only props from the old document so we add write-only props again.
		// https://github.com/pulumi/pulumi-aws-native/pull/678
		const removeWriteOnlyProps = (
			remote: ResourceDocument | Record<string, any> | undefined,
			old: ResourceDocument | Record<string, any>
		) => {
			for (const key in old) {
				// If remote is undefined or doesn't have this key, delete it from old
				if (!remote || typeof remote[key] === 'undefined') {
					delete old[key]
					continue
				}

				// Process recursively if value is a non-null object
				if (old[key] && typeof old[key] === 'object') {
					removeWriteOnlyProps(remote[key], old[key])
				}
			}
		}
		removeWriteOnlyProps(remoteDocument, oldDocument)

		// Some resources require certain fields to be present in the patch document.
		// So we have to remove them from the old document.

		for (const field of requiredFields) {
			objectPath.del(oldDocument, field)
		}

		// Create patch operations

		const operations = createPatch(oldDocument, newDocument)

		return operations
	}

	// private updateOperations(_remoteDocument: any, _oldDocument: ResourceDocument, newDocument: ResourceDocument) {
	// 	return createPatch({}, newDocument)
	// }

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
		const result = await this.send(
			new CreateResourceCommand({
				TypeName: type,
				DesiredState: JSON.stringify(document),
				ClientToken: token,
			})
		)

		return this.progressStatus(result.ProgressEvent!)
	}

	async update({
		token,
		type,
		id,
		oldDocument,
		newDocument,
		remoteDocument,
		requiredDocumentFields = [],
	}: UpdateProps) {
		let result
		try {
			result = await this.send(
				new UpdateResourceCommand({
					TypeName: type,
					Identifier: id,
					PatchDocument: JSON.stringify(
						this.updateOperations(remoteDocument, oldDocument, newDocument, requiredDocumentFields)
					),
					ClientToken: token,
				})
			)
		} catch (error) {
			if (error instanceof ResourceNotFoundException) {
				throw new ResourceNotFound(error.message)
			}

			throw error
		}

		return this.progressStatus(result.ProgressEvent!)
	}

	async delete({ token, type, id }: DeleteProps) {
		const result = await this.send(
			new DeleteResourceCommand({
				TypeName: type,
				Identifier: id,
				ClientToken: token,
			})
		)

		await this.progressStatus(result.ProgressEvent!)
	}
}
