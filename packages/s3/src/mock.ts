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
import { Body } from './types'
import { hashSHA1 } from './hash'

export const mockS3 = () => {
	const fn = vi.fn()
	const store: Record<
		string,
		{
			body: Body
			sha1: string
		}
	> = {}

	const s3ClientMock = mockClient(S3Client)

	s3ClientMock.on(PutObjectCommand).callsFake(async (input: PutObjectCommandInput) => {
		await nextTick(fn)
		const sha1 = await hashSHA1(input.Body)

		store[input.Key!] = {
			body: input.Body,
			sha1: sha1,
		}

		return {
			ChecksumSHA1: sha1,
		}
	})

	s3ClientMock.on(GetObjectCommand).callsFake(async (input: GetObjectCommandInput) => {
		await nextTick(fn)

		const data = store[input.Key!]

		if (data) {
			const stream = new Readable()
			stream.push(data.body)
			stream.push(null)
			return {
				ChecksumSHA1: data.sha1,
				Body: sdkStreamMixin(stream),
			}
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
