import { publish, mockSNS } from '../src/index'

describe('SNS', () => {
	const mock = mockSNS({
		test: () => {},
	})

	it('should send a notification', async () => {
		await publish({
			topic: 'test',
		})

		expect(mock.test).toBeCalledTimes(1)
	})

	// it('should publish sns message', async () => {
	// 	await client.send(new PublishCommand({
	// 		TopicArn: `arn:aws:sns:eu-west-1:xxx:service__topic`,
	// 		Message: '',
	// 	}))

	// 	expect(sns.service__topic).toBeCalledTimes(1)
	// })

	// it('should throw for unknown topic', async () => {
	// 	const promise = client.send(new PublishCommand({
	// 		TopicArn: `arn:aws:sns:eu-west-1:xxx:unknown`,
	// 		Message: '',
	// 	}))

	// 	await expect(promise).rejects.toThrow(TypeError)
	// })
})

// import { describe, it } from 'vitest'
// import { float, integer, string, ssm, array, json } from '../src/index'
// import { mockSSM } from '@awsless/test'

// describe('SSM', () => {

// 	const mock = mockSSM({
// 		'/string': 'string',
// 		'/integer': '1',
// 		'/float': '1.1',
// 		'/array': 'one, two',
// 		'/json': '{"foo":"bar"}',
// 	})

// 	type JSON = {
// 		foo: 'bar'
// 	}

// 	it('should resolve ssm paths', async () => {
// 		const result = await ssm({
// 			default: 'string',
// 			string: string('string'),
// 			integer: integer('integer'),
// 			float: float('float'),
// 			array: array<string>('array'),
// 			json: json<JSON>('json'),
// 		})

// 		expect(mock).toBeCalled()
// 		expect(result).toStrictEqual({
// 			default: 'string',
// 			string: 'string',
// 			integer: 1,
// 			float: 1.1,
// 			array: ['one', 'two'],
// 			json: { foo: 'bar' },
// 		})
// 	})

// 	it('should cache paths results', async () => {
// 		const fetch = (ttl:number) => ssm({ key: 'string'}, { ttl })

// 		await fetch(0)
// 		expect(mock).toBeCalledTimes(1)

// 		await fetch(10)
// 		expect(mock).toBeCalledTimes(2)

// 		await fetch(10)
// 		expect(mock).toBeCalledTimes(2)
// 	})
// })
