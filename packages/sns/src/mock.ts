import { PublishCommand, PublishCommandInput, SNSClient } from '@aws-sdk/client-sns'
import { mockObjectValues, nextTick } from '@awsless/utils'
import { mockClient } from 'aws-sdk-client-mock'
import { randomUUID } from 'crypto'
// @ts-ignore
import { Mock } from 'vitest'

type Topics = {
	[key: string]: (payload: any) => any
}

const globalList: Record<string, Mock> = {}

export const mockSNS = <T extends Topics>(topics: T) => {
	const alreadyMocked = Object.keys(globalList).length > 0
	const list = mockObjectValues(topics)

	Object.assign(globalList, list)

	if (alreadyMocked) {
		return list
	}

	mockClient(SNSClient)
		.on(PublishCommand)
		.callsFake(async (input: PublishCommandInput) => {
			const parts = input.TopicArn?.split(':') ?? ''
			const topic = parts[parts.length - 1] ?? ''
			const callback = globalList[topic]

			if (!callback) {
				throw new TypeError(`Sns mock function not defined for: ${topic}`)
			}

			await nextTick(callback, {
				Records: [
					{
						Sns: {
							TopicArn: input.TopicArn,
							MessageId: randomUUID(),
							Timestamp: new Date().toISOString(),
							Message: input.Message,
						},
					},
				],
			})
		})

	beforeEach(() => {
		Object.values(list).forEach(fn => {
			fn.mockClear()
		})
	})

	return list
}

// export const mockLambda = <T extends Lambdas>(lambdas: T) => {
// 	const alreadyMocked = Object.keys(globalList).length > 0
// 	const list = mockObjectValues(lambdas)

// 	Object.assign(globalList, list)

// 	if (alreadyMocked) {
// 		return list
// 	}

// 	mockClient(LambdaClient)
// 		.on(ListFunctionsCommand)
// 		.callsFake(async (): Promise<ListFunctionsCommandOutput> => {
// 			return {
// 				$metadata: {},
// 				Functions: [
// 					{
// 						FunctionName: 'test',
// 						FunctionArn: 'arn:aws:lambda:us-west-2:123456789012:function:project--service--lambda-name',
// 					},
// 				],
// 			}
// 		})

// 		.on(InvokeCommand)
// 		.callsFake(async (input: InvokeCommandInput) => {
// 			const name = input.FunctionName ?? ''
// 			const type = input.InvocationType ?? 'RequestResponse'
// 			const payload: unknown = input.Payload ? parse(toUtf8(input.Payload)) : undefined
// 			const callback = globalList[name]

// 			if (!callback) {
// 				throw new TypeError(`Lambda mock function not defined for: ${name}`)
// 			}

// 			const result = await nextTick(callback, payload)

// 			if (type === 'RequestResponse' && result) {
// 				return {
// 					Payload: fromUtf8(stringify(result)),
// 				}
// 			}

// 			return {
// 				Payload: undefined,
// 			}
// 		})

// 	beforeEach &&
// 		beforeEach(() => {
// 			Object.values(globalList).forEach(fn => {
// 				fn.mockClear()
// 			})
// 		})

// 	return list
// }
