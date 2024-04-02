import { AwsCredentialIdentity, AwsCredentialIdentityProvider } from '@aws-sdk/types'
import { CloudProvider, CreateProps, DeleteProps, GetProps, UpdateProps } from '../../../core/cloud'
import {
	DeleteObjectsCommand,
	ListObjectVersionsCommand,
	ListObjectsV2Command,
	S3Client,
} from '@aws-sdk/client-s3'

type ProviderProps = {
	credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider
	region: string
	cloudProvider: CloudProvider
}

export class BucketProvider implements CloudProvider {
	protected client: S3Client
	protected cloudProvider: CloudProvider

	constructor(props: ProviderProps) {
		this.client = new S3Client(props)
		this.cloudProvider = props.cloudProvider
	}

	own(id: string) {
		return id === 'aws-s3-bucket'
	}

	async get(props: GetProps) {
		return this.cloudProvider.get(props)
	}

	async create(props: CreateProps) {
		return this.cloudProvider.create(props)
	}

	async update(props: UpdateProps) {
		return this.cloudProvider.update(props)
	}

	async delete(props: DeleteProps<{ BucketName: string }, { forceDelete: boolean }>) {
		if (props.extra.forceDelete) {
			await this.emptyBucket(props.document.BucketName)
		}

		return this.cloudProvider.delete(props)
	}

	private async emptyBucket(bucket: string) {
		await Promise.all([
			//
			this.deleteBucketObjects(bucket),
			this.deleteBucketObjectVersions(bucket),
		])
	}

	private async deleteBucketObjects(bucket: string) {
		while (true) {
			const result = await this.client.send(
				new ListObjectsV2Command({
					Bucket: bucket,
					MaxKeys: 1000,
				})
			)

			if (!result.Contents || result.Contents.length === 0) {
				break
			}

			await this.client.send(
				new DeleteObjectsCommand({
					Bucket: bucket,
					Delete: {
						Objects: result.Contents.map(object => ({
							Key: object.Key,
						})),
					},
				})
			)
		}
	}

	private async deleteBucketObjectVersions(bucket: string) {
		while (true) {
			const result = await this.client.send(
				new ListObjectVersionsCommand({
					Bucket: bucket,
					MaxKeys: 1000,
				})
			)

			const objects = [...(result.DeleteMarkers ?? []), ...(result.Versions ?? [])]

			if (objects.length === 0) {
				break
			}

			await this.client.send(
				new DeleteObjectsCommand({
					Bucket: bucket,
					Delete: {
						Objects: objects.map(object => ({
							Key: object.Key,
							VersionId: object.VersionId,
						})),
					},
				})
			)
		}
	}
}
