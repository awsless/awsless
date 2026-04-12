import { ECSClient, RunTaskCommand, RunTaskCommandInput } from '@aws-sdk/client-ecs'
import { parse } from '@awsless/json'
import { mockObjectValues, nextTick } from '@awsless/utils'
import { mockClient } from 'aws-sdk-vitest-mock'
import type { Mock } from 'vitest'

type Tasks = {
	[key: string]: (payload: any) => unknown
}

const globalList: Record<string, Mock> = {}

export const mockEcs = <T extends Tasks>(tasks: T) => {
	const alreadyMocked = Object.keys(globalList).length > 0
	const list = mockObjectValues(tasks)

	Object.assign(globalList, list)

	if (alreadyMocked) {
		return list
	}

	const client = mockClient(ECSClient)

	client.on(RunTaskCommand).callsFake(async (input: RunTaskCommandInput) => {
		const name = input.taskDefinition ?? ''
		const callback = globalList[name]

		if (!callback) {
			throw new TypeError(`ECS mock function not defined for: ${name}`)
		}

		const envVars = input.overrides?.containerOverrides?.[0]?.environment ?? []
		const payloadEntry = envVars.find(e => e.name === 'PAYLOAD')
		const payload = payloadEntry?.value ? parse(payloadEntry.value) : undefined

		await nextTick(callback, payload)

		return {
			tasks: [
				{
					taskArn: `arn:aws:ecs:us-east-1:000000000000:task/mock/${name}`,
				},
			],
			failures: [],
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
