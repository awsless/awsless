import { InvokeCommand, LambdaClient, ListFunctionsCommand } from '@aws-sdk/client-lambda'
import { fromUtf8, toUtf8 } from '@aws-sdk/util-utf8-node'
import { mockLambda } from '../src'

describe('Lambda Mock', () => {
	const lambda = mockLambda({
		echo: (payload: unknown) => {
			return payload
		},
	})

	const lambda2 = mockLambda({
		other: (payload: unknown) => {
			return payload
		},
	})

	const client = new LambdaClient({})

	it('should list lambda functions', async () => {
		const result = await client.send(new ListFunctionsCommand({}))

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
		const result = await client.send(
			new InvokeCommand({
				FunctionName: 'echo',
				Payload: fromUtf8(JSON.stringify('Hello')),
			})
		)

		expect(JSON.parse(toUtf8(result.Payload!))).toBe('Hello')
		expect(lambda.echo).toBeCalledTimes(1)
	})

	it('should invoke without payload', async () => {
		const result = await client.send(
			new InvokeCommand({
				FunctionName: 'echo',
			})
		)

		expect(result.Payload).toBe(undefined)
		expect(lambda.echo).toBeCalledTimes(1)
	})

	it('should invoke second mock', async () => {
		const result = await client.send(
			new InvokeCommand({
				FunctionName: 'other',
			})
		)

		expect(result.Payload).toBe(undefined)
		expect(lambda2.other).toBeCalledTimes(1)
	})

	it('should throw for unknown lambda', async () => {
		const promise = client.send(
			new InvokeCommand({
				FunctionName: 'unknown',
				Payload: fromUtf8(JSON.stringify('')),
			})
		)

		await expect(promise).rejects.toThrow(TypeError)
		expect(lambda.echo).toBeCalledTimes(0)
	})

	it('should throw for unknown lambda', async () => {
		const promise = client.send(
			new InvokeCommand({
				FunctionName: 'unknown',
				Payload: fromUtf8(JSON.stringify('')),
			})
		)

		await expect(promise).rejects.toThrow(TypeError)
		expect(lambda.echo).toBeCalledTimes(0)
	})
})
