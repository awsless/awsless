import { copyObject, createPresignedPost, deleteObject, getObject, mockS3, putObject } from '../src'
import { headObject } from '../src/commands'
import { hashSHA1 } from '../src/hash'

describe('S3 Commands', () => {
	const mock = mockS3()
	const body = 'payload'

	it('should store a file in s3', async () => {
		const result = await putObject({
			bucket: 'test',
			key: 'test',
			body,
			metadata: {
				test: 'test',
			},
		})

		expect(mock).toBeCalledTimes(1)
		expect(result).toStrictEqual({
			sha1: await hashSHA1(body),
		})
	})

	it('should retrieve a file from s3', async () => {
		const result = await getObject({
			bucket: 'test',
			key: 'test',
		})

		expect(mock).toBeCalledTimes(1)
		expect(await result?.body.transformToString()).toBe(body)
		expect(result?.sha1).toBe(await hashSHA1(body))
		expect(result?.metadata).toStrictEqual({
			test: 'test',
		})
	})

	it('should retrieve the header of a file from s3', async () => {
		const result = await headObject({
			bucket: 'test',
			key: 'test',
		})

		expect(mock).toBeCalledTimes(1)
		expect(result?.sha1).toBe(await hashSHA1(body))
		expect(result?.metadata).toStrictEqual({
			test: 'test',
		})
	})

	it('should copy a file between s3 buckets', async () => {
		await copyObject({
			source: {
				bucket: 'test',
				key: 'test',
			},
			destination: {
				bucket: 'test-new',
				key: 'test-new',
			},
		})

		expect(mock).toBeCalledTimes(1)
	})

	it('should delete a file from s3', async () => {
		await deleteObject({
			bucket: 'test',
			key: 'test',
		})

		expect(mock).toBeCalledTimes(1)
	})

	it('should not retrieve a file from s3', async () => {
		const result = await getObject({
			bucket: 'test',
			key: 'test',
		})

		expect(result).toBe(undefined)
	})

	it('should create a presigned post', async () => {
		const result = await createPresignedPost({
			bucket: 'test',
			key: 'test',
		})

		expect(result).toStrictEqual({
			url: expect.any(String),
			fields: expect.any(Object),
		})
	})
})
