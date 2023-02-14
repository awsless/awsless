import { Duration } from 'aws-cdk-lib'
// import { PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam'
import { Architecture, Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda'
import { SnsEventSource, SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources'
import { ITopic } from 'aws-cdk-lib/aws-sns'
import { IQueue } from 'aws-cdk-lib/aws-sqs'
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
	queue: IQueue
	batchSize?: number
	maxBatchingWindow?: Duration
	maxConcurrency?: number
}

type SNSType = {
	type: 'SNS'
	topic: ITopic
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
		// code: Code.fromAsset(join(process.cwd(), props.file)),
		code: Code.fromInline(join(process.cwd(), props.file)),
		environment: props.environment,
	})

	if (props.events) {
		props.events.map(event => {
			// const eventId = `${id}-${event.type}`

			switch (event.type) {
				case 'SQS':
					fn.addEventSource(new SqsEventSource(event.queue))

					// fn.addEventSourceMapping(eventId, {
					// 	enabled: true,
					// 	batchSize: event.batchSize,
					// 	eventSourceArn: event.queue,
					// 	maxBatchingWindow: event.maxBatchingWindow,
					// 	maxConcurrency: event.maxConcurrency
					// })

					// fn.addToRolePolicy(new PolicyStatement({
					// 	actions: [
					// 		'sqs:ReceiveMessage',
					// 		'sqs:DeleteMessage',
					// 		'sqs:GetQueueAttributes',
					// 	],
					// 	resources: [ event.queue ],
					// }))

					break

				case 'SNS':
					fn.addEventSource(new SnsEventSource(event.topic))

					// new Subscription(scope, eventId, {
					// 	topic: event.topic,
					// 	protocol: SubscriptionProtocol.LAMBDA,
					// 	endpoint: fn.functionArn
					// })

					// fn.addPermission(eventId, {
					// 	action: 'lambda:InvokeFunction',
					// 	principal: new ServicePrincipal('sns.amazonaws.com'),
					// 	sourceArn: event.topic.topicArn,
					// })

					break
			}
		})
	}

	return fn
}
