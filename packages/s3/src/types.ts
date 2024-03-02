import type { S3Client, StorageClass } from '@aws-sdk/client-s3'
import type { SdkStream } from '@aws-sdk/types'
import type { Readable } from 'stream'

export type { S3Client, StorageClass } from '@aws-sdk/client-s3'
export type Body = string | Readable | ReadableStream | Blob | Uint8Array | Buffer | undefined
export type BodyStream = SdkStream<Readable | Blob | ReadableStream<any> | undefined>

export type PutObjectProps = {
	client?: S3Client
	bucket: string
	key: string
	body: Body
	metadata?: Record<string, string>
	storageClass?: StorageClass
}

export type GetObjectProps = Pick<PutObjectProps, 'client' | 'bucket' | 'key'>
export type DeleteObjectProps = Pick<PutObjectProps, 'client' | 'bucket' | 'key'>
