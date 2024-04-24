import { AwsCredentialIdentity, AwsCredentialIdentityProvider } from '@aws-sdk/types'
import { CloudProvider, CreateProps, DeleteProps, GetProps, UpdateProps } from '../../../core/cloud'
import {
	DeleteObjectCommand,
	GetObjectAttributesCommand,
	PutObjectCommand,
	S3Client,
	S3ServiceException,
} from '@aws-sdk/client-s3'

type ProviderProps = {
	credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider
	region: string
}

type Document = {
	Bucket: string
	Key: string
	CacheControl?: string
	ContentType?: string
	Metadata?: Record<string, string>
}

export class BucketObjectProvider implements CloudProvider {
	protected client: S3Client

	constructor(props: ProviderProps) {
		this.client = new S3Client(props)
	}

	own(id: string) {
		return id === 'aws-s3-bucket-object'
	}

	async get({ document }: GetProps<Document>) {
		const result = await this.client.send(
			new GetObjectAttributesCommand({
				Bucket: document.Bucket,
				Key: document.Key,
				ObjectAttributes: ['ETag', 'Checksum'],
			})
		)

		return {
			VersionId: result.VersionId,
			ETag: result.ETag,
			Checksum: result.Checksum,
		}
	}

	async create({ document, assets }: CreateProps<Document>) {
		await this.client.send(
			new PutObjectCommand({
				...document,
				Body: assets.body?.data,
			})
		)

		return JSON.stringify([document.Bucket, document.Key])
	}

	async update({ oldDocument, newDocument, assets }: UpdateProps<Document>) {
		// Note: We could also allow changing buckets.

		if (oldDocument.Bucket !== newDocument.Bucket) {
			throw new Error(`BucketObject can't change the bucket name`)
		}

		if (oldDocument.Key !== newDocument.Key) {
			await this.client.send(
				new DeleteObjectCommand({
					Bucket: oldDocument.Bucket,
					Key: oldDocument.Key,
				})
			)
		}

		await this.client.send(
			new PutObjectCommand({
				...newDocument,
				Body: assets.body?.data,
			})
		)

		return JSON.stringify([newDocument.Bucket, newDocument.Key])
	}

	async delete({ document }: DeleteProps<Document>) {
		try {
			await this.client.send(
				new DeleteObjectCommand({
					Bucket: document.Bucket,
					Key: document.Key,
				})
			)
		} catch (error) {
			if (error instanceof S3ServiceException) {
				if (error.name === 'NoSuchBucket') {
					return
				}
			}

			throw error
		}
	}
}
