import { mockS3, putObject, getObject, deleteObject } from '../src'

describe('S3 Commands', () => {
	const mock = mockS3()

	it('should store a file in s3', async () => {
		await putObject({
			bucket: 'test',
			name: 'test',
			body: 'hello world',
		})

		expect(mock).toBeCalledTimes(1)
	})

	it('should retrieve a file from s3', async () => {
		const result = await getObject({
			bucket: 'test',
			name: 'test',
		})
		expect(result.body).toBe('hello world')
		expect(mock).toBeCalledTimes(1)
	})

	it('should delete a file from s3', async () => {
		await deleteObject({
			bucket: 'test',
			name: 'test',
		})
		expect(mock).toBeCalledTimes(1)
	})

	it('should not retrieve a file from s3', async () => {
		const result = await getObject({
			bucket: 'test',
			name: 'test',
		})
		expect(result.body).toBe(undefined)
	})
})
