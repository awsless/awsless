import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda'
import { fromUtf8, toUtf8 } from '@aws-sdk/util-utf8-node'
import { mockLambda } from '../src'

describe('Lambda Mock', () => {

	const lambda = mockLambda({
		service__echo: (payload: unknown) => {
			return payload
		}
	})

	const client = new LambdaClient({})

	it('should invoke lambda', async () => {
		const result = await client.send(new InvokeCommand({
			FunctionName: 'service__echo',
			Payload: fromUtf8(JSON.stringify('Hello'))
		}))

		// @ts-ignore
		expect(JSON.parse(toUtf8(result.Payload))).toBe('Hello')
		expect(lambda.service__echo).toBeCalledTimes(1)
	})

	it('should invoke without payload', async () => {
		const result = await client.send(new InvokeCommand({
			FunctionName: 'service__echo',
		}))

		// @ts-ignore
		expect(result.Payload).toBe(undefined)
		expect(lambda.service__echo).toBeCalledTimes(1)
	})

	it('should throw for unknown lambda', async () => {
		const promise = client.send(new InvokeCommand({
			FunctionName: 'unknown',
			Payload: fromUtf8(JSON.stringify(''))
		}))

		await expect(promise).rejects.toThrow(TypeError)
		expect(lambda.service__echo).toBeCalledTimes(0)
	})
})
