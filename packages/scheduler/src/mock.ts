import { CreateScheduleCommand, CreateScheduleCommandInput, SchedulerClient } from '@aws-sdk/client-scheduler'
import { parse } from '@awsless/json'
import { mockObjectValues, nextTick } from '@awsless/utils'
import { mockClient } from 'aws-sdk-client-mock'
// @ts-ignore
import { Mock } from 'vitest'

type Lambdas = {
	[key: string]: (payload: any) => any
}

export const mockScheduler = <T extends Lambdas>(lambdas: T) => {
	const list = mockObjectValues(lambdas)

	// @ts-ignore
	mockClient(SchedulerClient)
		// @ts-ignore
		.on(CreateScheduleCommand)
		.callsFake(async (input: CreateScheduleCommandInput) => {
			const parts = input.Target?.Arn?.split(':') ?? ''
			const name = parts[parts.length - 1]!
			const callback = list[name]

			if (!callback) {
				throw new TypeError(`Scheduler mock function not defined for: ${name}`)
			}

			const payload = input.Target?.Input ? parse(input.Target.Input) : undefined

			await nextTick(callback, payload)
		})

	beforeEach(() => {
		Object.values(list).forEach(fn => {
			fn.mockClear()
		})
	})

	return list
}
