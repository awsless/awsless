// import { S3Client, ListObjectsV2Command, ListObjectVersionsCommand, DeleteObjectsCommand } from '@aws-sdk/client-s3'

import { sendCode } from '../util.js';

export const deleteHostedZoneRecordsHandlerCode = /* JS */ `

const { S3Client, ListObjectsV2Command, ListObjectVersionsCommand, DeleteObjectsCommand } = require('@aws-sdk/client-s3')

const client = new S3Client({})

${ sendCode }

exports.handler = async (event) => {
	const type = event.RequestType
	const bucketName = event.ResourceProperties.bucketName

	try {
		if(type === 'Delete') {
			await emptyBucket(bucketName)
		}

		await send(event, bucketName, 'SUCCESS')
	}
	catch(error) {
		if (error instanceof Error) {
			await send(event, bucketName, 'FAILED', {}, error.message)
		} else {
			await send(event, bucketName, 'FAILED', {}, 'Unknown error')
		}
	}
}

const emptyBucket = async (bucket) => {
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
`
