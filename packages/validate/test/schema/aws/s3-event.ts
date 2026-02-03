import { parse, s3Event, ValiError } from '../../../src'

describe('S3 Event', () => {
	const schema = s3Event()
	const time = new Date()
	const payload = {
		event: 'ObjectCreated:Put',
		bucket: 'bucket',
		key: 'key',
		size: 100,
		eTag: 'hash',
		time,
	}

	it('should allow easy test input', () => {
		const result = parse(schema, payload)

		expect(result).toStrictEqual([payload])
		expect(() => parse(schema, { id: '1' })).toThrow(ValiError)
	})

	it('should allow array schemas', () => {
		const result = parse(schema, [payload])

		expect(result).toStrictEqual([payload])
		expect(() => parse(schema, [{ id: '1' }])).toThrow(ValiError)
	})

	it('should allow structured input', () => {
		const result = parse(schema, {
			Records: [
				{
					eventTime: time.toISOString(),
					eventName: 'ObjectCreated:Put',
					s3: {
						bucket: {
							name: 'bucket',
						},
						object: {
							key: 'key',
							size: 100,
							eTag: 'hash',
						},
					},
				},
			],
		})

		expect(result).toStrictEqual([payload])
	})
})
