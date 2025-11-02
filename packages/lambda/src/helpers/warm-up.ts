import { invoke } from '../commands/invoke'

const warmerKey = 'warmer'
const concurrencyKey = 'concurrency'
const concurrencyLimit = 10

type Event = {
	[warmerKey]: true
	[concurrencyKey]: number
}

type Input = {
	concurrency: number
}

export const isWarmUpEvent = (event: unknown): event is Event => {
	return typeof event === 'object' && (event as Event).warmer === true
}

export const getWarmUpEvent = (event: unknown): Input | undefined => {
	if (!isWarmUpEvent(event)) return

	return {
		concurrency: parseInt(String(event[concurrencyKey]), 10) || 3,
	}
}

export const warmUp = async (input: Input) => {
	// const event = {
	// 	action: warmerKey,
	// 	functionName: process.env.AWS_LAMBDA_FUNCTION_NAME,
	// 	functionVersion: process.env.AWS_LAMBDA_FUNCTION_VERSION,
	// }

	if (input.concurrency > concurrencyLimit) {
		throw new Error(`Warm up concurrency limit can't be greater than ${concurrencyLimit}`)
	}

	// console.log(event)

	if (input.concurrency <= 1) {
		return
	}

	await invoke({
		name: process.env.AWS_LAMBDA_FUNCTION_NAME ?? '',
		// qualifier: '$LATEST',
		payload: {
			[warmerKey]: true,
			[concurrencyKey]: input.concurrency - 1,
		},
	})
}
