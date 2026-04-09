import {
	InvokeCommand,
	LambdaClient,
	ListFunctionsCommand,
	ListFunctionsCommandOutput,
} from '@aws-sdk/client-lambda'
import { fromUtf8, toUtf8 } from '@aws-sdk/util-utf8-node'
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

	client
		.on(ListFunctionsCommand)
		.callsFake(async (): Promise<ListFunctionsCommandOutput> => {
			return {
				$metadata: {},
				Functions: [
					{
						FunctionName: 'test',
						FunctionArn: 'arn:aws:lambda:us-west-2:123456789012:function:project--service--lambda-name',
					},
				],
			}
		})

	client
		.on(InvokeCommand)
		// @ts-expect-error - Uint8Array generic mismatch between fromUtf8 return and InvokeCommandOutput.Payload
		.callsFake(async (input) => {
			const name = input.FunctionName ?? ''
			const type = input.InvocationType ?? 'RequestResponse'
			const payload: unknown = input.Payload ? parse(toUtf8(input.Payload as Uint8Array)) : undefined
			const callback = globalList[name]

			if (!callback) {
				throw new TypeError(`Lambda mock function not defined for: ${name}`)
			}

			const result = await nextTick(callback, payload)

			return {
				Payload: type === 'RequestResponse' && result ? fromUtf8(stringify(result)) : undefined,
			}
		})

	beforeEach &&
		beforeEach(() => {
			Object.values(globalList).forEach(fn => {
				fn.mockClear()
			})
		})

	return list
}
