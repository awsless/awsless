import { InvokeCommand, InvokeCommandInput, LambdaClient, ListFunctionsCommand } from '@aws-sdk/client-lambda'
import { parse, stringify } from '@awsless/json'
import { mockObjectValues, nextTick } from '@awsless/utils'
import { mockClient } from 'aws-sdk-vitest-mock'
import { Mock } from 'vitest'

type Lambdas = {
	[key: string]: (payload: any) => unknown
}

const globalList: Record<string, Mock> = {}

export const mockLambda = <T extends Lambdas>(lambdas: T) => {
	const alreadyMocked = Object.keys(globalList).length > 0
	const list = mockObjectValues(lambdas)

	Object.assign(globalList, list)

	if (alreadyMocked) {
		return list
	}

	const client = mockClient(LambdaClient)

	client.on(ListFunctionsCommand).resolves({
		$metadata: {},
		Functions: [
			{
				FunctionName: 'test',
				FunctionArn: 'arn:aws:lambda:us-west-2:123456789012:function:project--service--lambda-name',
			},
		],
	})

	client.on(InvokeCommand).callsFake((async (input: InvokeCommandInput) => {
		const name = input.FunctionName ?? ''
		const type = input.InvocationType ?? 'RequestResponse'
		const payload = input.Payload ? parse(new TextDecoder().decode(input.Payload as Uint8Array)) : undefined
		const callback = globalList[name]

		if (!callback) {
			throw new TypeError(`Lambda mock function not defined for: ${name}`)
		}

		const result = await nextTick(callback, payload)

		return {
			Payload: type === 'RequestResponse' && result ? new TextEncoder().encode(stringify(result)) : undefined,
		}
	}) as any) // Uint8Array from TextEncoder works at runtime but doesn't match Uint8ArrayBlobAdapter type

	beforeEach &&
		beforeEach(() => {
			Object.values(globalList).forEach(fn => {
				fn.mockClear()
			})
		})

	return list
}
