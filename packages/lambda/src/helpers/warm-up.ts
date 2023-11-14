import { Context } from 'aws-lambda'
import { randomUUID } from 'crypto'
import { invoke } from '../commands/invoke'

const warmerKey = 'warmer'
const invocationKey = '__WARMER_INVOCATION_ID__'
const correlationKey = '__WARMER_CORRELATION_ID__'
const concurrencyKey = 'concurrency'
const concurrencyLimit = 10

type Event = {
	[warmerKey]: true
	[concurrencyKey]: number
	[invocationKey]: number
	[correlationKey]: string
}

type Input = {
	invocation: number
	concurrency: number
	correlation: string
}

export const isWarmUpEvent = (event: unknown): event is Event => {
	return typeof event === 'object' && (event as Event).warmer === true
}

export const getWarmUpEvent = (event: unknown): Input | undefined => {
	if (!isWarmUpEvent(event)) return

	return {
		invocation: parseInt(String(event[invocationKey]), 10) || 0,
		concurrency: parseInt(String(event[concurrencyKey]), 10) || 3,
		correlation: event[correlationKey],
	}
}

export const warmUp = async (input: Input, context?: Context) => {
	const event = {
		action: warmerKey,
		functionName: process.env.AWS_LAMBDA_FUNCTION_NAME,
		functionVersion: process.env.AWS_LAMBDA_FUNCTION_VERSION,
	}

	if (input.concurrency > concurrencyLimit) {
		throw new Error(`Warm up concurrency limit can't be greater than ${concurrencyLimit}`)
	}

	if (input.correlation) {
		console.log({
			...event,
			...input,
		})
	} else {
		const correlation = context?.awsRequestId || randomUUID()

		console.log({
			...event,
			correlation,
			invocation: 1,
		})

		await Promise.all(
			Array.from({ length: input.concurrency - 1 }).map((_, index) => {
				return invoke({
					name: process.env.AWS_LAMBDA_FUNCTION_NAME || '',
					qualifier: '$LATEST',
					payload: {
						[warmerKey]: true,
						[invocationKey]: index + 2,
						[correlationKey]: correlation,
						[concurrencyKey]: input.concurrency,
					},
				})
			})
		)
	}
}
