import { CloudFormationCustomResourceEvent } from 'aws-lambda'
import { S3Client, ListObjectsV2Command, ListObjectVersionsCommand, DeleteObjectsCommand } from '@aws-sdk/client-s3'
import { send } from '../util.js';

const client = new S3Client({})

export const handler = async (event:CloudFormationCustomResourceEvent) => {
	const type = event.RequestType
	const bucketName = event.ResourceProperties.bucketName

	console.log('Type:', type)
	console.log('BucketName:', bucketName)

	try {
		if(type === 'Delete') {
			console.log('Deleting bucket objects...')
			await emptyBucket(bucketName)
			console.log('Done')
		}

		await send(event, bucketName, 'SUCCESS')
	}
	catch(error) {
		if (error instanceof Error) {
			await send(event, bucketName, 'FAILED', {}, error.message)
		} else {
			await send(event, bucketName, 'FAILED', {}, 'Unknown error')
		}

		console.error(error);
	}
}

const emptyBucket = async (bucket: string) => {
	while(true) {
		const result = await client.send(new ListObjectsV2Command({
			Bucket: bucket,
			MaxKeys: 1000
		}))

		if(!result.Contents || result.Contents.length === 0) {
			break
		}

		await client.send(new DeleteObjectsCommand({
			Bucket: bucket,
			Delete: {
				Objects: result.Contents.map(object => ({
					Key: object.Key,
				}))
			},
		}))
	}

	while(true) {
		const result = await client.send(new ListObjectVersionsCommand({
			Bucket: bucket,
			MaxKeys: 1000
		}))

		if(!result.Versions || result.Versions.length === 0) {
			break
		}

		await client.send(new DeleteObjectsCommand({
			Bucket: bucket,
			Delete: {
				Objects: result.Versions.map(object => ({
					Key: object.Key,
					VersionId: object.VersionId,
				}))
			},
		}))
	}
}
