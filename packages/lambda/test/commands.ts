import { string } from '@awsless/validate'
import { invoke, lambda, listFunctions, mockLambda } from '../src'

describe('Lambda', () => {
	const mock = mockLambda({
		echo: payload => payload,
		noop: () => {},
	})

	it('should list lambda functions', async () => {
		const result = await listFunctions({})
		expect(result).toStrictEqual({
			$metadata: {},
			Functions: [
				{
					FunctionName: 'test',
					FunctionArn: 'arn:aws:lambda:us-west-2:123456789012:function:project--service--lambda-name',
				},
			],
		})
	})

	it('should invoke lambda', async () => {
		const result = await invoke({
			name: 'echo',
			payload: 'hi',
		})

		expectTypeOf(result).toEqualTypeOf<unknown>()
		expect(result).toBe('hi')
		expect(mock.echo).toBeCalledTimes(1)
	})

	it('should invoke without payload', async () => {
		const result = await invoke({
			name: 'noop',
		})

		expectTypeOf(result).toEqualTypeOf<unknown>()
		expect(result).toBe(undefined)
		expect(mock.noop).toBeCalledTimes(1)
	})

	it('should play well with payload type validation', async () => {
		const echo = lambda({
			schema: string(),
			handle: input => input,
		})

		const result = await invoke<typeof echo>({
			name: 'echo',
			payload: 'hi',
		})

		expectTypeOf(result).toEqualTypeOf<string>()
		expect(result).toBe('hi')
	})

	it('should infer the payload correctly', async () => {
		const f1 = lambda({ handle: () => {} })
		const f2 = lambda({ handle: input => input })
		const f3 = lambda({ handle: () => 1 })
		const f4 = lambda({ handle: () => (true ? 1 : undefined) })

		const i1 = await invoke<typeof f1>({ name: 'noop' })
		const i2 = await invoke<typeof f2>({ name: 'noop' })
		const i3 = await invoke<typeof f3>({ name: 'noop' })
		const i4 = await invoke<typeof f4>({ name: 'noop' })

		expectTypeOf(i1).toEqualTypeOf<void>()
		expectTypeOf(i2).toEqualTypeOf<unknown>()
		expectTypeOf(i3).toEqualTypeOf<number>()
		expectTypeOf(i4).toEqualTypeOf<1 | undefined>()
	})
})
