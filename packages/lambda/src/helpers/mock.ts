import { InvokeCommand, LambdaClient, ListFunctionsCommand } from '@aws-sdk/client-lambda'
import { parse, stringify } from '@awsless/json'
import { mockObjectValues, nextTick } from '@awsless/utils'
import type { Mock } from 'vitest'

// Vitest is never imported here, so the runtime entry stays free of it.
type Vitest = typeof import('vitest')
declare const beforeEach: Vitest['beforeEach'] | undefined

const resolveVi = (vi?: Vitest['vi']) => {
	const found = vi ?? (globalThis as { vi?: Vitest['vi'] }).vi

	if (!found) {
		throw new Error('mockLambda needs the vitest globals enabled, or pass { vi } explicitly.')
	}

	return found
}

type Lambdas = {
	[key: string]: (payload: any) => unknown
}

const globalList: Record<string, Mock> = {}

export const mockLambda = <T extends Lambdas>(lambdas: T, options?: { vi?: Vitest['vi'] }) => {
	const alreadyMocked = Object.keys(globalList).length > 0
	const list = mockObjectValues(lambdas)

	Object.assign(globalList, list)

	if (alreadyMocked) {
		return list
	}

	resolveVi(options?.vi)
		.spyOn(LambdaClient.prototype, 'send')
		.mockImplementation((async (command: unknown) => {
			if (command instanceof ListFunctionsCommand) {
				return {
					$metadata: {},
					Functions: [
						{
							FunctionName: 'test',
							FunctionArn: 'arn:aws:lambda:us-west-2:123456789012:function:project--service--lambda-name',
						},
					],
				}
			}

			if (command instanceof InvokeCommand) {
				const input = command.input
				const name = input.FunctionName ?? ''
				const type = input.InvocationType ?? 'RequestResponse'
				const payload = input.Payload ? parse(new TextDecoder().decode(input.Payload as Uint8Array)) : undefined
				const callback = globalList[name]

				if (!callback) {
					throw new TypeError(`Lambda mock function not defined for: ${name}`)
				}

				const result = await nextTick(callback, payload)

				return {
					Payload:
						type === 'RequestResponse' && result ? new TextEncoder().encode(stringify(result)) : undefined,
				}
			}

			throw new TypeError(`Lambda mock doesn't support: ${(command as object)?.constructor?.name}`)
		}) as any)

	if (typeof beforeEach !== 'undefined') {
		beforeEach(() => {
			Object.values(globalList).forEach(fn => {
				fn.mockClear()
			})
		})
	}

	return list
}
