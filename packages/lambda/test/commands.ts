import { lambda, invoke, mockLambda } from '../src'
import { string } from '@awsless/validate'

describe('Lambda', () => {
	const mock = mockLambda({
		echo: payload => payload,
		noop: () => {},
	})

	it('should invoke lambda', async () => {
		const result = await invoke({
			name: 'echo',
			payload: 'hi',
		})

		expect(result).toBe('hi')
		expect(mock.echo).toBeCalledTimes(1)
	})

	it('should invoke without payload', async () => {
		const result = await invoke({
			name: 'noop',
		})

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

		expect(result).toBe('hi')
	})
})
