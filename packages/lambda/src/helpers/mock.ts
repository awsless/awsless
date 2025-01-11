import {
	InvokeCommand,
	InvokeCommandInput,
	LambdaClient,
	ListFunctionsCommand,
	ListFunctionsCommandOutput,
} from '@aws-sdk/client-lambda'
import { fromUtf8, toUtf8 } from '@aws-sdk/util-utf8-node'
import { parse, stringify } from '@awsless/json'
import { mockObjectValues, nextTick } from '@awsless/utils'
import { mockClient } from 'aws-sdk-client-mock'
// @ts-ignore
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

	mockClient(LambdaClient)
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

		.on(InvokeCommand)
		.callsFake(async (input: InvokeCommandInput) => {
			const name = input.FunctionName ?? ''
			const type = input.InvocationType ?? 'RequestResponse'
			const payload: unknown = input.Payload ? parse(toUtf8(input.Payload)) : undefined
			const callback = globalList[name]

			if (!callback) {
				throw new TypeError(`Lambda mock function not defined for: ${name}`)
			}

			const result = await nextTick(callback, payload)

			if (type === 'RequestResponse' && result) {
				return {
					Payload: fromUtf8(stringify(result)),
				}
			}

			return {
				Payload: undefined,
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
