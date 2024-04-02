import { AwsCredentialIdentity, AwsCredentialIdentityProvider } from '@aws-sdk/types'
import { CloudProvider, CreateProps, DeleteProps, GetProps, UpdateProps } from '../../../core/cloud'
import { DeleteObjectCommand, GetObjectAttributesCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

type ProviderProps = {
	credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider
	region: string
}

type Document = {
	bucket: string
	key: string
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
				Bucket: document.bucket,
				Key: document.key,
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
				Bucket: document.bucket,
				Key: document.key,
				Body: assets.body?.data,
			})
		)

		return JSON.stringify([document.bucket, document.key])
	}

	async update({ oldDocument, newDocument, assets }: UpdateProps<Document>) {
		// Note: We could also allow changing buckets.

		if (oldDocument.bucket !== newDocument.bucket) {
			throw new Error(`BucketObject can't change the bucket name`)
		}

		if (oldDocument.key !== newDocument.key) {
			await this.client.send(
				new DeleteObjectCommand({
					Bucket: oldDocument.bucket,
					Key: oldDocument.key,
				})
			)
		}

		await this.client.send(
			new PutObjectCommand({
				Bucket: newDocument.bucket,
				Key: newDocument.key,
				Body: assets.body?.data,
			})
		)

		return JSON.stringify([newDocument.bucket, newDocument.key])
	}

	async delete({ document }: DeleteProps<Document>) {
		await this.client.send(
			new DeleteObjectCommand({
				Bucket: document.bucket,
				Key: document.key,
			})
		)
	}
}
