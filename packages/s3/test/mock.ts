import {
	CopyObjectCommand,
	DeleteObjectCommand,
	GetObjectCommand,
	HeadObjectCommand,
	NoSuchKey,
	PutObjectCommand,
	S3Client,
} from '@aws-sdk/client-s3'
import { mockS3 } from '../src'

describe('S3 Mock', () => {
	const s3 = mockS3()
	const client = new S3Client({})

	it('should store a file in s3', async () => {
		await client.send(
			new PutObjectCommand({
				Bucket: 'test',
				Key: 'test',
				Body: 'hello world',
				Metadata: {
					test: 'test',
				},
			})
		)

		expect(s3).toBeCalledTimes(1)
	})

	it('should retrieve a file in s3', async () => {
		const result = await client.send(
			new GetObjectCommand({
				Bucket: 'test',
				Key: 'test',
			})
		)

		expect(await result.Body?.transformToString()).toEqual('hello world')
		expect(result.Metadata).toStrictEqual({ test: 'test' })
		expect(s3).toBeCalledTimes(1)
	})

	it('should retrieve the header of a file in s3', async () => {
		const result = await client.send(
			new HeadObjectCommand({
				Bucket: 'test',
				Key: 'test',
			})
		)

		expect(result.Metadata).toStrictEqual({ test: 'test' })
		expect(s3).toBeCalledTimes(1)
	})

	it('should copy files between s3 buckets', async () => {
		await client.send(
			new CopyObjectCommand({
				Bucket: 'test-new',
				CopySource: `/test/test`,
				Key: 'test-new',
			})
		)

		expect(s3).toBeCalledTimes(1)
	})

	it('should delete a file in s3', async () => {
		await client.send(
			new DeleteObjectCommand({
				Bucket: 'test',
				Key: 'test',
			})
		)
		expect(s3).toBeCalledTimes(1)
	})

	it('should not retrieve a file in s3', async () => {
		await expect(
			client.send(
				new GetObjectCommand({
					Bucket: 'test',
					Key: 'test',
				})
			)
		).rejects.toThrow(NoSuchKey)
	})
})
