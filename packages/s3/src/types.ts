import type { S3Client, StorageClass } from '@aws-sdk/client-s3'
import type { Readable } from 'stream'

export type PutObject = {
	client?: S3Client
	bucket: string
	name: string
	body: string | Readable | ReadableStream | Blob
	metaData?: Record<string, string>
	storageClass?: StorageClass
}

export type GetObject = Pick<PutObject, 'client' | 'bucket' | 'name'>
export type DeleteObject = Pick<PutObject, 'client' | 'bucket' | 'name'>
