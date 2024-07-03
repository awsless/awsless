import {
	CopyObjectCommand,
	DeleteObjectCommand,
	GetObjectCommand,
	HeadObjectCommand,
	NoSuchKey,
	PutObjectCommand,
	S3Client,
	StorageClass,
} from '@aws-sdk/client-s3'
import { createPresignedPost as signedPost, PresignedPost } from '@aws-sdk/s3-presigned-post'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
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
	versionId?: string
}

export const getObject = async ({ client = s3Client(), bucket, key, versionId }: GetObjectProps) => {
	const command = new GetObjectCommand({
		Bucket: bucket,
		Key: key,
		VersionId: versionId,
	})

	let result

	try {
		result = await client.send(command)
	} catch (error) {
		if (error instanceof NoSuchKey) {
			return
		}

		throw error
	}

	if (!result || !result.Body) {
		return
	}

	return {
		metadata: result.Metadata ?? {},
		sha1: result.ChecksumSHA1!,
		body: result.Body,
	}
}

export type HeadObjectProps = {
	client?: S3Client
	bucket: string
	key: string
	versionId?: string
}

export const headObject = async ({ client = s3Client(), bucket, key, versionId }: HeadObjectProps) => {
	const command = new HeadObjectCommand({
		Bucket: bucket,
		Key: key,
		VersionId: versionId,
	})

	let result

	try {
		result = await client.send(command)
	} catch (error) {
		if (error instanceof NoSuchKey) {
			return
		}

		throw error
	}

	if (!result) {
		return
	}

	return {
		metadata: result.Metadata ?? {},
		sha1: result.ChecksumSHA1!,
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
	source: {
		bucket: string
		key: string
		versionId?: string
	}
	destination: {
		bucket: string
		key: string
	}
}

export const copyObject = async ({ client = s3Client(), source, destination }: CopyObjectProps) => {
	if (source.versionId) {
		source.key = `${source.key}?versionId=${source.versionId}`
	}

	const command = new CopyObjectCommand({
		Bucket: destination.bucket,
		CopySource: `/${source.bucket}/${source.key}`,
		Key: destination.key,
	})

	await client.send(command)
}

export type CreateSignedUploadUrlProps = {
	client?: S3Client
	bucket: string
	key: string
	fields?: Record<string, string>
	expires?: Duration
	contentLengthRange?: [Size, Size]
}

let signedUploadUrlMock: PresignedPost | undefined
export const setSignedUploadUrlMock = (m: PresignedPost) => {
	signedUploadUrlMock = m
}

export const createSignedUploadUrl = async ({
	client = s3Client(),
	bucket,
	key,
	fields,
	/** Duration before the presigned post expires. */
	expires,
	contentLengthRange,
}: CreateSignedUploadUrlProps) => {
	if (signedUploadUrlMock) {
		return signedUploadUrlMock
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

export type CreateSignedDownloadUrlProps = {
	client?: S3Client
	bucket: string
	key: string
	versionId?: string
	expires?: Duration
	// headers?: Record<string, string>
}

let signedDownloadUrlMock: string | undefined

export const setSignedDownloadUrlMock = (url: string) => {
	signedDownloadUrlMock = url
}

export const createSignedDownloadUrl = async ({
	client = s3Client(),
	bucket,
	key,
	versionId,
	expires,
}: CreateSignedDownloadUrlProps) => {
	if (signedDownloadUrlMock) {
		return signedDownloadUrlMock
	}

	const command = new GetObjectCommand({
		Bucket: bucket,
		Key: key,
		VersionId: versionId,
	})

	const url = await getSignedUrl(client, command, {
		expiresIn: expires ? Number(toSeconds(expires)) : undefined,
	})

	return url
}
