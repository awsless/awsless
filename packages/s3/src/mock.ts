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
// @ts-ignore
import { Mock } from 'vitest'

export const mockS3 = () => {
	const fn = vi.fn()
	const cache: Record<string, string> = {}

	const s3ClientMock = mockClient(S3Client)

	s3ClientMock.on(PutObjectCommand).callsFake(async (input: PutObjectCommandInput) => {
		await nextTick(fn)
		cache[input.Key!] = input.Body as string
		return {}
	})

	s3ClientMock.on(GetObjectCommand).callsFake(async (input: GetObjectCommandInput) => {
		await nextTick(fn)
		return { Body: cache[input.Key!] }
	})

	s3ClientMock.on(DeleteObjectCommand).callsFake(async (input: DeleteObjectCommandInput) => {
		await nextTick(fn)
		delete cache[input.Key!]
		return {}
	})

	beforeEach(() => {
		fn.mockClear()
	})

	return fn
}
