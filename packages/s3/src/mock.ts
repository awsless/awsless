import {
	CopyObjectCommand,
	CopyObjectCommandInput,
	DeleteObjectCommand,
	DeleteObjectCommandInput,
	GetObjectCommand,
	GetObjectCommandInput,
	HeadObjectCommand,
	NoSuchKey,
	PutObjectCommand,
	PutObjectCommandInput,
	S3Client,
} from '@aws-sdk/client-s3'
import { sdkStreamMixin } from '@aws-sdk/util-stream-node'
import { nextTick } from '@awsless/utils'
import { mockClient } from 'aws-sdk-client-mock'
import { Readable } from 'stream'
// @ts-ignore
import { Mock } from 'vitest'
import { setSignedDownloadUrlMock, setSignedUploadUrlMock } from './commands'
import { hashSHA1 } from './hash'
import { Body } from './types'

type Object = {
	body: Body
	sha1: string
	meta: Record<string, string>
}

class MemoryStore {
	store: Record<string, Record<string, Object>> = {}

	bucket(name: string) {
		if (!this.store[name]) {
			this.store[name] = {}
		}

		return this.store[name]!
	}

	get(bucket: string, key: string) {
		return this.bucket(bucket)[key]
	}

	put(bucket: string, key: string, object: Object) {
		this.bucket(bucket)[key] = object
		return this
	}

	del(bucket: string, key: string) {
		delete this.bucket(bucket)[key]
		return this
	}
}

export const mockS3 = () => {
	const fn = vi.fn()
	const store = new MemoryStore()
	const s3ClientMock = mockClient(S3Client)

	s3ClientMock.on(PutObjectCommand).callsFake(async (input: PutObjectCommandInput) => {
		await nextTick(fn)
		const sha1 = await hashSHA1(input.Body)

		store.put(input.Bucket!, input.Key!, {
			body: input.Body,
			sha1: sha1,
			meta: input.Metadata ?? {},
		})

		return {
			ChecksumSHA1: sha1,
		}
	})

	s3ClientMock.on(GetObjectCommand).callsFake(async (input: GetObjectCommandInput) => {
		await nextTick(fn)

		const data = store.get(input.Bucket!, input.Key!)

		if (data) {
			const stream = new Readable()
			stream.push(data.body)
			stream.push(null)
			return {
				Metadata: data.meta,
				ChecksumSHA1: data.sha1,
				Body: sdkStreamMixin(stream),
			}
		}

		throw new NoSuchKey({
			$metadata: {},
			message: 'No such key',
		})
	})

	s3ClientMock.on(HeadObjectCommand).callsFake(async (input: GetObjectCommandInput) => {
		await nextTick(fn)

		const data = store.get(input.Bucket!, input.Key!)

		if (data) {
			return {
				Metadata: data.meta,
				ChecksumSHA1: data.sha1,
			}
		}

		throw new NoSuchKey({
			$metadata: {},
			message: 'No such key',
		})
	})

	s3ClientMock.on(CopyObjectCommand).callsFake(async (input: CopyObjectCommandInput) => {
		await nextTick(fn)
		const [_, SourceBucket, ...Path] = input.CopySource!.split('/')
		const SourceKey = Path!.join('/')
		const data = store.get(SourceBucket!, SourceKey)

		if (data) {
			store.put(input.Bucket!, input.Key!, data)
		}

		return
	})

	s3ClientMock.on(DeleteObjectCommand).callsFake(async (input: DeleteObjectCommandInput) => {
		await nextTick(fn)
		store.del(input.Bucket!, input.Key!)
		return {}
	})

	setSignedDownloadUrlMock('http://s3-download-url.com')

	setSignedUploadUrlMock({
		url: 'http://s3-upload-url.com',
		fields: {},
	})

	beforeEach(() => {
		fn.mockClear()
	})

	return fn
}
