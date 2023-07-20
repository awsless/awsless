import { mockS3 } from '../src'
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

describe('S3 Mock', () => {
	const s3 = mockS3()

	it('should store a file in s3', async () => {
		const client = new S3Client({})
		await client.send(
			new PutObjectCommand({
				Bucket: 'test',
				Key: 'test',
				Body: 'hello world',
			})
		)

		expect(s3).toBeCalledTimes(1)
	})

	it('should retrieve a file in s3', async () => {
		const client = new S3Client({})
		const result = await client.send(
			new GetObjectCommand({
				Bucket: 'test',
				Key: 'test',
			})
		)

		expect(await result.Body?.transformToString()).toEqual('hello world')
		expect(s3).toBeCalledTimes(1)
	})

	it('should delete a file in s3', async () => {
		const client = new S3Client({})
		await client.send(
			new DeleteObjectCommand({
				Bucket: 'test',
				Key: 'test',
			})
		)
		expect(s3).toBeCalledTimes(1)
	})

	it('should not retrieve a file in s3', async () => {
		const client = new S3Client({})
		const result = await client.send(
			new GetObjectCommand({
				Bucket: 'test',
				Key: 'test',
			})
		)

		expect(result).toBeUndefined()
	})
})
