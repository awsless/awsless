import { Duration } from 'aws-cdk-lib'
import { Architecture, Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda'
import { Construct } from 'constructs'
// import { join } from 'path'

type Props = {
	name: string
	file: string
	runtime?: Runtime
	architecture?: Architecture
	timeout?: Duration
	memorySize?: number
	environment?: Record<string, string>
	events?: TriggerEvent[]
}

type SQSType = {
	type: 'SQS'
	queue: string
	batchSize?: number
	maxBatchingWindow?: Duration
	maxConcurrency?: number
}

type SNSType = {
	type: 'SNS'
}

type TriggerEvent = SQSType | SNSType

export const LambdaFunction = (scope: Construct, id: string, props: Props) => {
	const fn = new Function(scope, id, {
		functionName: props.name,
		runtime: props.runtime || Runtime.NODEJS_18_X,
		handler: 'index.default',
		timeout: props.timeout || Duration.seconds(10),
		memorySize: props.memorySize || 256,
		architecture: props.architecture || Architecture.ARM_64,
		code: Code.fromInline('hoi'),
		environment: props.environment,
	})

	if (props.events) {
		props.events.map((event, index) => {
			const eventId = `${id}${event.type}${index}`

			switch (event.type) {
				case 'SQS':
					fn.addEventSourceMapping(eventId, {
						enabled: true,
						batchSize: event.batchSize,
						eventSourceArn: event.queue,
						maxBatchingWindow: event.maxBatchingWindow,
						maxConcurrency: event.maxConcurrency,
					})
					break

				case 'SNS':
					fn.addEventSourceMapping(eventId, {
						// FunctionName:	GetAtt ctx.name, 'Arn'
						// Enabled:		true
						// BatchSize:		ctx.number 'BatchSize', 10
						// EventSourceArn: queue
						// ...maximumBatchingWindowInSeconds ctx
						// ...maximumConcurrency ctx
					})
					break
			}
		})
	}

	return fn
}
