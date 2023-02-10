
import { SchedulerClient, CreateScheduleCommand, CreateScheduleCommandInput, DeleteScheduleCommand, DeleteScheduleCommandInput } from '@aws-sdk/client-scheduler'
import { asyncCall, mockObjectKeys } from '../helpers/mock'
import { mockClient } from 'aws-sdk-client-mock'

type Lambdas = {
	[key: string]: (payload:any) => any
}

export const mockScheduler = <T extends Lambdas>(lambdas:T) => {
	const list = mockObjectKeys(lambdas)

	// @ts-ignore
	mockClient(SchedulerClient)
		// @ts-ignore
		.on(CreateScheduleCommand)
		.callsFake(async (input: CreateScheduleCommandInput) => {
			const parts = input.Target?.Arn?.split(':') || []
			const name = parts[ parts.length - 1 ]
			const callback = list[ name ]

			if(!callback) {
				throw new TypeError(`Scheduler mock function not defined for: ${ name }`)
			}

			const payload:unknown = input.Target?.Input ? JSON.parse(input.Target.Input) : undefined

			await asyncCall(callback, payload)
		})

		// @ts-ignore
		.on(DeleteScheduleCommand)
		.callsFake(async (_: DeleteScheduleCommandInput) => {

		})

	beforeEach(() => {
		Object.values(list).forEach(fn => {
			fn.mockClear()
		})
	})

	return list
}
