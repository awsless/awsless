import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { s3Client } from './client'
import { PutObjectProps, GetObjectProps, DeleteObjectProps } from './types'

export const putObject = async ({
	client = s3Client(),
	bucket,
	key,
	body,
	metadata,
	storageClass = 'STANDARD',
}: PutObjectProps) => {
	const command = new PutObjectCommand({
		Bucket: bucket,
		Key: key,
		Body: body,
		Metadata: metadata,
		StorageClass: storageClass,
		ChecksumAlgorithm: 'SHA1',
	})

	const result = await client.send(command)

	return {
		sha1: result.ChecksumSHA1!,
	}
}

export const getObject = async ({ client = s3Client(), bucket, key }: GetObjectProps) => {
	const command = new GetObjectCommand({
		Bucket: bucket,
		Key: key,
	})

	const result = await client.send(command)

	if (!result || !result.Body) {
		return
	}

	return {
		metadata: result.Metadata ?? {},
		sha1: result.ChecksumSHA1!,
		body: result.Body,
	}
}

export const deleteObject = async ({ client = s3Client(), bucket, key }: DeleteObjectProps) => {
	const command = new DeleteObjectCommand({
		Bucket: bucket,
		Key: key,
	})

	await client.send(command)
}
