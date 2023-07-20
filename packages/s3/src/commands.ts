import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { s3Client } from './client'
import { PutObject, GetObject, DeleteObject } from './types'

export const putObject = ({
	client = s3Client(),
	bucket,
	name,
	body,
	metaData,
	storageClass = 'STANDARD',
}: PutObject) => {
	const command = new PutObjectCommand({
		Bucket: bucket,
		Key: name,
		Body: body,
		Metadata: metaData,
		StorageClass: storageClass,
	})

	return client.send(command)
}

export const getObject = async ({ client = s3Client(), bucket, name }: GetObject) => {
	const command = new GetObjectCommand({
		Bucket: bucket,
		Key: name,
	})

	const result = await client.send(command)

	if (!result || !result.Body) {
		return
	}

	return {
		body: await result.Body.transformToString(),
	}
}

export const deleteObject = ({ client = s3Client(), bucket, name }: DeleteObject) => {
	const command = new DeleteObjectCommand({
		Bucket: bucket,
		Key: name,
	})

	return client.send(command)
}
