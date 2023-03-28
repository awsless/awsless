import { float, integer, string, ssm, array, json, mockSSM, SSMClient } from '../src/index'

describe('SSM', () => {
	const mock = mockSSM({
		'/string': 'string',
		'/integer': '1',
		'/float': '1.1',
		'/array': 'one, two',
		'/json': '{"foo":"bar"}',
	})

	type JSON = {
		foo: 'bar'
	}

	it('should resolve ssm paths', async () => {
		const result = await ssm({
			default: 'string',
			string: string('string'),
			integer: integer('integer'),
			float: float('float'),
			array: array('array'),
			json: json<JSON>('json'),
		})

		expect(mock).toBeCalled()
		expect(result).toStrictEqual({
			default: 'string',
			string: 'string',
			integer: 1,
			float: 1.1,
			array: ['one', 'two'],
			json: { foo: 'bar' },
		})
	})

	it('should cache paths results', async () => {
		const fetch = (ttl: number) => ssm({ key: 'string' }, { ttl })

		await fetch(0)
		expect(mock).toBeCalledTimes(1)

		await fetch(10)
		expect(mock).toBeCalledTimes(2)

		await fetch(10)
		expect(mock).toBeCalledTimes(2)
	})

	it('should allow client with custom config', async () => {
		const client = new SSMClient({
			region: 'eu-west-2',
		})

		const result = await ssm(
			{
				default: 'string',
			},
			{ client }
		)

		expect(result).toStrictEqual({
			default: 'string',
		})
	})
})
