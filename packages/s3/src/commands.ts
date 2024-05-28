import {
	CopyObjectCommand,
	DeleteObjectCommand,
	GetObjectCommand,
	PutObjectCommand,
	S3Client,
	StorageClass,
} from '@aws-sdk/client-s3'
import { createPresignedPost as signedPost, PresignedPost } from '@aws-sdk/s3-presigned-post'
import { Duration, toSeconds } from '@awsless/duration'
import { Size, toBytes } from '@awsless/size'
import { s3Client } from './client'
import { Body } from './types'

export type PutObjectProps = {
	client?: S3Client
	bucket: string
	key: string
	body: Body
	metadata?: Record<string, string>
	storageClass?: StorageClass
}

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

export type GetObjectProps = {
	client?: S3Client
	bucket: string
	key: string
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

export type DeleteObjectProps = {
	client?: S3Client
	bucket: string
	key: string
}

export const deleteObject = async ({ client = s3Client(), bucket, key }: DeleteObjectProps) => {
	const command = new DeleteObjectCommand({
		Bucket: bucket,
		Key: key,
	})

	await client.send(command)
}

export type CopyObjectProps = {
	client?: S3Client
	bucket: string
	source: string
	key: string
	versionId?: string
}

export const copyObject = async ({ client = s3Client(), bucket, source, key, versionId }: CopyObjectProps) => {
	if (versionId) {
		source = `${source}?versionId=${versionId}`
	}

	const command = new CopyObjectCommand({
		Bucket: bucket,
		CopySource: source,
		Key: key,
	})

	await client.send(command)
}

export type CreatePresignedPostProps = {
	client?: S3Client
	bucket: string
	key: string
	fields?: Record<string, string>
	expires?: Duration
	contentLengthRange?: [Size, Size]
}

let mock: PresignedPost | undefined
export const setPresignedMock = (m: PresignedPost) => {
	mock = m
}

export const createPresignedPost = async ({
	client = s3Client(),
	bucket,
	key,
	fields,
	/** Duration before the presigned post expires. */
	expires,
	contentLengthRange,
}: CreatePresignedPostProps) => {
	if (mock) {
		return mock
	}

	const result = await signedPost(client, {
		Bucket: bucket,
		Key: key,
		Fields: fields,
		Expires: expires ? Number(toSeconds(expires)) : undefined,
		Conditions: contentLengthRange
			? [['content-length-range', Number(toBytes(contentLengthRange[0])), Number(toBytes(contentLengthRange[1]))]]
			: undefined,
	})

	return result
}
