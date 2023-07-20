import {
	S3Client,
	GetObjectCommand,
	PutObjectCommandInput,
	GetObjectCommandInput,
	PutObjectCommand,
	DeleteObjectCommand,
	DeleteObjectCommandInput,
} from '@aws-sdk/client-s3'
import { nextTick } from '@awsless/utils'
import { mockClient } from 'aws-sdk-client-mock'
import { sdkStreamMixin } from '@aws-sdk/util-stream-node'
// @ts-ignore
import { Mock } from 'vitest'
import { Readable } from 'stream'

export const mockS3 = () => {
	const fn = vi.fn()
	const store: Record<string, string> = {}

	const s3ClientMock = mockClient(S3Client)

	s3ClientMock.on(PutObjectCommand).callsFake(async (input: PutObjectCommandInput) => {
		await nextTick(fn)
		store[input.Key!] = input.Body as string
		return {}
	})

	s3ClientMock.on(GetObjectCommand).callsFake(async (input: GetObjectCommandInput) => {
		await nextTick(fn)

		const file = store[input.Key!]

		if (file) {
			const stream = new Readable()
			stream.push(file)
			stream.push(null)
			return { Body: sdkStreamMixin(stream) }
		}

		return
	})

	s3ClientMock.on(DeleteObjectCommand).callsFake(async (input: DeleteObjectCommandInput) => {
		await nextTick(fn)
		delete store[input.Key!]
		return {}
	})

	beforeEach(() => {
		fn.mockClear()
	})

	return fn
}
